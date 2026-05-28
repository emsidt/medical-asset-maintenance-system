from langchain_google_genai import ChatGoogleGenerativeAI

from ..core import GOOGLE_API_KEY

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GOOGLE_API_KEY
)