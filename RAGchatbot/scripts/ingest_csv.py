from langchain_community.document_loaders import CSVLoader
from langchain_core.documents import Document
import sys
import os

# Add RAGchatbot directory to Python path to enable app imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.embedding_service import vector_store

system_guide_faq_csv_path = "./data/failure-QA-data/failure-QA-data.csv"
failure_guide_faq_csv_path = "./data/system-guide-data/system-guide-data.csv"

csv_paths = [
    system_guide_faq_csv_path,
    failure_guide_faq_csv_path
]

def load_from_csv_path_and_format_data():
    formatted_documents = []

    for path in csv_paths:
        loader = CSVLoader(file_path=path, encoding="utf-8")
        raw_documents_per_path = loader.load()

        for doc in raw_documents_per_path:
            lines = doc.page_content.split("\n")

            question = lines[0].replace("question: ", "")
            answer = lines[1].replace("answer: ", "")

            formatted_content = f"""
question: {question}
answer: {answer}
""".strip()

            formatted_doc = Document(
                page_content=formatted_content,
                metadata={
                    "source": doc.metadata["source"],
                    "language": "vi"
                }
            )

            formatted_documents.append(formatted_doc)

    return formatted_documents

def run_ingestion():
    print("Starting CSV data ingestion...")
    docs = load_from_csv_path_and_format_data()
    print(f"Loaded {len(docs)} documents. Ingesting into Chroma Vector DB...")
    
    # Thêm tài liệu vào vector store
    vector_store.add_documents(docs)
    print("Ingested documents successfully!")


if __name__ == "__main__":
    run_ingestion()

