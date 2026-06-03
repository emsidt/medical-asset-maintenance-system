from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from ..core import GOOGLE_API_KEY, GOOGLE_MODEL, GROQ_API_KEY, GROQ_MODEL, RAG_LLM_PROVIDER


def create_llm():
    provider = RAG_LLM_PROVIDER

    if provider not in {"auto", "google", "groq"}:
        raise ValueError("RAG_LLM_PROVIDER must be one of: auto, google, groq")

    if provider in {"auto", "google"} and (GOOGLE_API_KEY or "").strip():
        return ChatGoogleGenerativeAI(
            model=GOOGLE_MODEL,
            google_api_key=GOOGLE_API_KEY,
            temperature=0.3,
        )

    if provider in {"auto", "groq"} and (GROQ_API_KEY or "").strip():
        return ChatGroq(
            model=GROQ_MODEL,
            api_key=GROQ_API_KEY,
            temperature=0.3,
        )

    return None


llm = create_llm()
