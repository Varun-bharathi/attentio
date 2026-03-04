const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
const writeStream = fs.createWriteStream('test.pdf');
doc.pipe(writeStream);
doc.text('Hello World');
doc.end();

writeStream.on('finish', () => {
    console.log('PDF generated successfully.');
});
