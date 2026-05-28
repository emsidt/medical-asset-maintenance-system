from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from ..core import GOOGLE_API_KEY, GROQ_API_KEY

# llm = ChatGoogleGenerativeAI(
#     model="gemini-2.0-flash",
#     google_api_key=GOOGLE_API_KEY
# )

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY,
    temperature=0.3
)