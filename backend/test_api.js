const fs = require('fs');

async function test() {
    try {
        // Register a faculty user just in case
        await fetch('http://localhost:8000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "Test Faculty",
                email: "faculty1@test.com",
                password: "password123",
                role: "faculty"
            })
        }); // ignore if already exists

        // Login
        const loginRes = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: "faculty1@test.com",
                password: "password123"
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log("Logged in, token:", token);

        // Fetch PDF
        const res = await fetch('http://localhost:8000/api/analytics/roadmap?category=Fullstack_JS', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Response status:", res.status);
        console.log("Content-Type:", res.headers.get('content-type'));

        const arrayBuffer = await res.arrayBuffer();
        console.log("Data size:", arrayBuffer.byteLength);

        fs.writeFileSync('output_test.pdf', Buffer.from(arrayBuffer));
        console.log("Saved output_test.pdf");
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
