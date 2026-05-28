from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vector_store = Chroma(
    persist_directory="./vector_db",
    embedding_function=embedding_model
)

retriever = vector_store.as_retriever(
    search_kwargs={"k": 5}
)