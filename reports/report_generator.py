import matplotlib.pyplot as plt
from reportlab.pdfgen import canvas
import os

def generate_pdf_report(meeting_id: int, attention_scores: list, filepath: str):
    """
    Generates a PDF using reportlab and optionally matplotlib for graphs.
    """
    c = canvas.Canvas(filepath)
    c.drawString(100, 750, f"Attention Report for Meeting ID: {meeting_id}")
    
    y = 700
    for idx, score in enumerate(attention_scores):
        c.drawString(100, y, f"Student {score['student_id']}: {score['attention_score']}% Attention")
        y -= 20
    
    c.save()

def generate_attention_graph(time_data, attention_data, output_path):
    plt.figure()
    plt.plot(time_data, attention_data, label='Average Attention')
    plt.xlabel('Time')
    plt.ylabel('Attention Score (%)')
    plt.title('Class Attention Over Time')
    plt.savefig(output_path)
    plt.close()
