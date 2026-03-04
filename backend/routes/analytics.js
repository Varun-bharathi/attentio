const express = require('express');
const { AttentionReport } = require('../db');
const { authMiddleware } = require('./auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/report/:meeting_id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ detail: "Only faculty can view reports" });
        }
        const reports = await AttentionReport.findAll({ where: { meeting_id: req.params.meeting_id } });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/roadmap', authMiddleware, (req, res) => {
    if (req.user.role !== 'faculty') {
        return res.status(403).json({ detail: "Only faculty can generate roadmaps" });
    }

    const category = req.query.category || 'Fullstack_JS';
    const PDFDocument = require('pdfkit');
    const filepath = path.join(__dirname, '..', `roadmap_${category.toLowerCase()}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filepath);
    doc.pipe(writeStream);

    const labels = {
        'Fullstack_JS': 'Fullstack (JavaScript) Roadmap',
        'Fullstack_Python': 'Fullstack (Python) Roadmap',
        'Fullstack_Java': 'Fullstack (Java) Roadmap',
        'AIML': 'AI & Machine Learning (AIML) Roadmap',
        'AIDS': 'AI & Data Science (AIDS) Roadmap',
        'SAP': 'SAP Development Roadmap',
        'AWS': 'Amazon Web Services (AWS) Roadmap',
        'UIUX': 'UI/UX Design Roadmap'
    };

    doc.fontSize(24).fillColor('#4f46e5').text(labels[category] || 'Learning Roadmap', { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('black');

    if (category === 'Fullstack_JS') {
        doc.fontSize(16).fillColor('#2563eb').text('Beginner Learner');
        doc.fontSize(12).fillColor('black').text('   - Structure: HTML5, CSS3, Flexbox/Grid\n   - Logic: Vanilla JavaScript (ES6+), DOM Manipulation\n   - Tooling: Git, GitHub, VS Code, NPM basics');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Intermediate Learner');
        doc.fontSize(12).fillColor('black').text('   - Frontend Frameworks: React.js (Hooks, Context) or Vue.js\n   - Backend: Node.js, Express.js architecture, RESTful APIs\n   - DBs & Auth: MongoDB (Mongoose), Postman, JWT, bcrypt');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Advanced Learner');
        doc.fontSize(12).fillColor('black').text('   - Architecture: Next.js (SSR/SSG), Microservices\n   - State & API: Redux Toolkit, GraphQL, WebSockets (Socket.IO)\n   - DevOps: Docker, CI/CD pipelines, AWS/Vercel deployment');
    }
    else if (category === 'Fullstack_Python') {
        doc.fontSize(16).fillColor('#2563eb').text('Beginner Learner');
        doc.fontSize(12).fillColor('black').text('   - Core Logic: Python 3+, Variables, Loops, Functions\n   - UI Basics: HTML, CSS, basic DOM concepts\n   - Concepts: Object-Oriented Programming (OOP), Git Version Control');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Intermediate Learner');
        doc.fontSize(12).fillColor('black').text('   - Backend Frameworks: Django (MVT) or Flask/FastAPI\n   - APIs: Django REST Framework (DRF), Postman testing\n   - Databases: PostgreSQL/MySQL relational modeling, SQLAlchemy');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Advanced Learner');
        doc.fontSize(12).fillColor('black').text('   - Asynchronous: Celery, Redis message brokers\n   - Tooling: Pytest, WebSockets (Django Channels)\n   - Deployment: Docker, Nginx, Gunicorn, AWS EC2');
    }
    else if (category === 'Fullstack_Java') {
        doc.fontSize(16).fillColor('#2563eb').text('Beginner Learner');
        doc.fontSize(12).fillColor('black').text('   - Core Logic: Java 8+ features, Collections framework\n   - Web Basics: HTML/CSS, basic Servlet/JSP concepts\n   - Tooling: Maven, Gradle, IntelliJ/Eclipse, Git basics');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Intermediate Learner');
        doc.fontSize(12).fillColor('black').text('   - Backend Core: Spring Boot, Spring MVC, Spring Data JPA\n   - Frontend Integration: React or Angular basics\n   - Databases & Security: MySQL, Hibernate ORM, Spring Security (JWT)');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Advanced Learner');
        doc.fontSize(12).fillColor('black').text('   - Architecture: Spring Cloud (Microservices), Eureka/API Gateway\n   - Messaging & Caching: Apache Kafka, RabbitMQ, Redis\n   - DevOps: Docker, Kubernetes orchestrations, AWS RDS');
    }
    else if (category === 'AIML') {
        doc.fontSize(16).fillColor('#2563eb').text('Beginner Learner');
        doc.fontSize(12).fillColor('black').text('   - Math Foundation: Linear Algebra, Calculus, Statistics\n   - Language Tools: Python, Jupyter Notebooks\n   - Data Processing: NumPy, Pandas DataFrames, Matplotlib/Seaborn');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Intermediate Learner');
        doc.fontSize(12).fillColor('black').text('   - Classical ML: Scikit-learn, Regression, Random Forests, SVMs\n   - Unsupervised: K-Means clustering, PCA\n   - Feature Engineering: Outlier handling, standard scaling, encodings');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Advanced Learner');
        doc.fontSize(12).fillColor('black').text('   - Deep Learning: PyTorch, TensorFlow/Keras neural networks\n   - Specialties: CNNs for Computer Vision, Transformers for NLP (LLMs)\n   - MLOps: MLflow, Dockerized model APIs (FastAPI), GPU computing');
    }
    else if (category === 'AIDS') {
        doc.fontSize(16).fillColor('#2563eb').text('Beginner Learner');
        doc.fontSize(12).fillColor('black').text('   - Data Fundamentals: Excel, basic SQL querying (SELECT, JOINs)\n   - Python Basics: Pandas, Seaborn data visualization\n   - Analysis math: Descriptive statistics, probability basics');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Intermediate Learner');
        doc.fontSize(12).fillColor('black').text('   - Advanced SQL: Window functions, complex aggregations\n   - Dashboarding: Tableau or Microsoft PowerBI\n   - Inference prep: A/B testing, Hypothesis testing, ETL processes');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Advanced Learner');
        doc.fontSize(12).fillColor('black').text('   - Big Data Tools: Apache Hadoop, Spark Dataframes\n   - Predictive: XGBoost, Time-Series forecasting (ARIMA)\n   - End-to-end: Deriving direct business insights & automated pipelines');
    }
    else if (category === 'SAP') {
        doc.fontSize(16).fillColor('#2563eb').text('Beginner Learner');
        doc.fontSize(12).fillColor('black').text('   - Basics: SAP GUI navigation, Enterprise Resource Planning concepts\n   - Modules Introduction: FI/CO (Finance), MM, SD overviews\n   - Foundations: NetWeaver architecture');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Intermediate Learner');
        doc.fontSize(12).fillColor('black').text('   - Core ABAP: ABAP Dictionary, Reports, ALV grids\n   - Functionality: User Exits, BAPIs, Function Modules\n   - OOP: Object-Oriented ABAP, interface development');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Advanced Learner');
        doc.fontSize(12).fillColor('black').text('   - Cutting Edge SAP: SAP HANA Database concepts (CDS Views)\n   - UI Technologies: SAP Fiori, SAPUI5, and OData Service Gateways\n   - System Integrations: IDocs, PI/PO enterprise routing');
    }
    else if (category === 'AWS') {
        doc.fontSize(16).fillColor('#2563eb').text('Beginner Learner');
        doc.fontSize(12).fillColor('black').text('   - Cloud Fundamentals: Global infrastructure, IAM configuration\n   - Core Services: EC2 (compute instances), S3 (storage buckets)\n   - Costs: AWS Billing, CloudWatch metrics');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Intermediate Learner');
        doc.fontSize(12).fillColor('black').text('   - Databases: AWS RDS (SQL), DynamoDB (NoSQL)\n   - Advanced Compute: Serverless applications via AWS Lambda\n   - Networking: VPC architectures, Subnets, Route53, Load Balancers');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Advanced Learner');
        doc.fontSize(12).fillColor('black').text('   - DevOps & Automation: CodePipeline CI/CD, Elastic Beanstalk\n   - Infrastructure as Code: CloudFormation or AWS CDK\n   - Security & Scale: Auto-scaling groups, WAF, Elasticache');
    }
    else if (category === 'UIUX') {
        doc.fontSize(16).fillColor('#2563eb').text('Beginner Learner');
        doc.fontSize(12).fillColor('black').text('   - Research Basics: User Personas, Empathy Mapping\n   - Tooling Intro: Figma basics, Canvas navigation\n   - Theory: Color theory, Typography basics, Spacing systems (8pt grid)');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Intermediate Learner');
        doc.fontSize(12).fillColor('black').text('   - Architecture: Wireframing, Information Architecture, User Flows\n   - Advanced Figma: Auto-layout, Variants, Component Libraries\n   - Design Systems: Material Design or Apple HIG understanding');
        doc.moveDown();
        doc.fontSize(16).fillColor('#2563eb').text('Advanced Learner');
        doc.fontSize(12).fillColor('black').text('   - Prototyping: Interactive states, Micro-animations, Transitions\n   - Validation: A/B testing, Usability Testing frameworks\n   - Developer Handoff: Zeplin, Figma Dev Mode, a11y (Accessibility)');
    }

    doc.end();

    writeStream.on('finish', () => {
        res.download(filepath, `roadmap_${category.toLowerCase()}.pdf`, (err) => {
            if (!err) {
                fs.unlink(filepath, () => { });
            }
        });
    });
});

module.exports = router;
