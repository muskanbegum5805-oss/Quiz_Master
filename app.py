import os
from dotenv import load_dotenv

load_dotenv()
from flask import Flask, render_template, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector

app = Flask(__name__)
app.secret_key = os.getenv("Secret_Key")

# Connect Python to MySQL
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", 4000)),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        ssl_ca=None,
        ssl_verify_cert=False
    )


# Home page
@app.route("/")
def home():
    return render_template("index.html")


# Test database connection
@app.route("/test-db")
def test_db():
    try:
        connection = get_db_connection()
        connection.close()

        return "MySQL Connected Successfully!"

    except Exception as e:
        return f"Connection Error: {e}"


# Fetch questions from MySQL
@app.route("/get-questions")
def get_questions():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT question_id, question_text,
                   option_a, option_b,
                   option_c, option_d,
                   correct_answer
            FROM questions
        """)

        questions = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify(questions)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Save student quiz score
@app.route("/save-score", methods=["POST"])
def save_score():
    connection = None
    cursor = None

    try:
        if "student_id" not in session:
            return jsonify({"error": "Please login first"}), 401

        data = request.get_json()

        marks = int(data["marks"])
        total = int(data["total_questions"])

        if total <= 0 or marks < 0 or marks > total:
            return jsonify({"error": "Invalid score"}), 400

        student_id = session["student_id"]

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO scores
            (student_id, total_questions, correct_answers, marks_obtained)
            VALUES (%s, %s, %s, %s)
        """, (student_id, total, marks, marks))

        cursor.execute("""
            UPDATE student
            SET marks = GREATEST(marks, %s)
            WHERE student_id = %s
        """, (marks, student_id))

        connection.commit()

        return jsonify({"message": "Score saved successfully!"})

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
            
@app.route("/leaderboard")
def leaderboard():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT student_name, marks
            FROM student
            ORDER BY marks DESC
        """)

        students = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify(students)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/register", methods=["POST"])
def register():
    connection = None
    cursor = None

    try:
        data = request.get_json()

        name = data.get("student_name", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not name or not email or not password:
            return jsonify({"error": "Please fill all fields"}), 400

        hashed_password = generate_password_hash(password)

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO student
            (student_name, email, password, marks, address)
            VALUES (%s, %s, %s, %s, %s)
        """, (name, email, hashed_password, 0, ""))

        connection.commit()

        return jsonify({"message": "Registration successful!"})

    except mysql.connector.IntegrityError:
        return jsonify({"error": "Email already registered!"}), 409

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route("/login", methods=["POST"])
def login():
    connection = None
    cursor = None

    try:
        data = request.get_json()

        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"error": "Enter email and password"}), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM student WHERE email = %s",
            (email,)
        )

        student = cursor.fetchone()

        if student and check_password_hash(student["password"], password):

            session["student_id"] = student["student_id"]
            session["student_name"] = student["student_name"]

            return jsonify({
                "message": "Login successful!",
                "student_name": student["student_name"]
            })

        return jsonify({"error": "Invalid email or password"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
    
# Run Flask application
if __name__ == "__main__":
    app.run(debug=True)
