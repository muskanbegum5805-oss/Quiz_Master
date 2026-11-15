let questions = [];
let currentQuestion = 0;
let score = 0;
let studentName = "";

async function startQuiz() {
    studentName = document.getElementById("studentName").value.trim();

    if (studentName === "") {
        alert("Please enter your name!");
        return;
    }

    const message = document.getElementById("message");
    message.innerHTML = "Loading questions...";

    try {
        const response = await fetch("/get-questions");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not load questions");
        }

        questions = data;

        if (questions.length === 0) {
            message.innerHTML = "No questions available!";
            return;
        }

        currentQuestion = 0;
        score = 0;
        showQuestion();

    } catch (error) {
        message.innerHTML = "Error: " + error.message;
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showQuestion() {
    const q = questions[currentQuestion];

    const options = [
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d
    ];

    let html = `
        <p class="progress">
            Question ${currentQuestion + 1} of ${questions.length}
        </p>
        <h3>${escapeHTML(q.question_text)}</h3>
        <div class="options">
    `;

    options.forEach((option, index) => {
        html += `
            <button class="option-btn"
            onclick="checkAnswer(${index})">
                ${escapeHTML(option)}
            </button>
        `;
    });

    html += "</div>";

    document.getElementById("message").innerHTML = html;
}

function checkAnswer(selectedIndex) {
    const selectedAnswer = questions[currentQuestion][
        ["option_a", "option_b", "option_c", "option_d"][selectedIndex]
    ];

    const correctAnswer = questions[currentQuestion].correct_answer;

    if (
        selectedAnswer.trim().toLowerCase() ===
        correctAnswer.trim().toLowerCase()
    ) {
        score++;
    }

    currentQuestion++;

    if (currentQuestion < questions.length) {
        showQuestion();
    } else {
        showResult();
    }
}
async function showResult() {
    const message = document.getElementById("message");

    message.innerHTML = `
        <h2>Quiz Completed!</h2>
        <h3>Well done, ${escapeHTML(studentName)}!</h3>
        <p class="final-score">
            Your Score: ${score} / ${questions.length}
        </p>
        <p>Saving your score...</p>
    `;

    try {
        const response = await fetch("/save-score", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                student_name: studentName,
                marks: score,
                total_questions: questions.length
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to save score");
        }

        message.innerHTML += `
            <p style="color: green;">
                Score saved successfully!
            </p>
            <button onclick="startQuiz()">Play Again</button>
            <button onclick="showLeaderboard()">Leaderboard</button>
        `;

    } catch (error) {
        message.innerHTML += `
            <p style="color: red;">
                Score could not be saved: ${escapeHTML(error.message)}
            </p>
        `;
    }
}

async function showLeaderboard() {
    const message = document.getElementById("message");

    message.innerHTML = "<h2>🏆 Loading Leaderboard...</h2>";

    try {
        const response = await fetch("/leaderboard");
        const students = await response.json();

        if (!response.ok) {
            throw new Error(students.error || "Unable to load leaderboard");
        }

        if (students.length === 0) {
            message.innerHTML = "<h2>No scores available yet!</h2>";
            return;
        }

        let html = `
            <h2>🏆 Leaderboard</h2>
            <table>
                <tr>
                    <th>Rank</th>
                    <th>Student Name</th>
                    <th>Marks</th>
                </tr>
        `;

        students.forEach((student, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHTML(student.student_name)}</td>
                    <td>${student.marks}</td>
                </tr>
            `;
        });

        html += "</table>";

        message.innerHTML = html;

    } catch (error) {
        message.innerHTML = "Error: " + escapeHTML(error.message);
    }
}
// Show Registration Form
function showRegister() {
    document.getElementById("loginForm").hidden = true;
    document.getElementById("registerForm").hidden = false;
}

// Show Login Form
function showLogin() {
    document.getElementById("registerForm").hidden = true;
    document.getElementById("loginForm").hidden = false;
}

// Student Registration
async function registerStudent() {
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                student_name: name,
                email: email,
                password: password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error);
            return;
        }

        alert("Registration successful! Please login.");
        document.getElementById("loginEmail").value = email;
        showLogin();

    } catch (error) {
        alert("Registration error: " + error.message);
    }
}

// Student Login
async function loginStudent() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password})
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error);
            return;
        }

        document.getElementById("authContainer").hidden = true;
        document.getElementById("quizContainer").hidden = false;

        document.getElementById("welcomeMessage").innerText =
            "Welcome, " + result.student_name + "!";

        document.getElementById("studentName").value =
            result.student_name;

        studentName = result.student_name;

    } catch (error) {
        alert("Login error: " + error.message);
    }
}
