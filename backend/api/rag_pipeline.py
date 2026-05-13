import os
import sys

# 1. Get the path to the 'backend' folder (one level up from 'api')
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# 2. Path to the 'core' folder where prompts.py lives
core_dir = os.path.join(backend_dir, "core")

# 3. Add 'core' to the system path
if core_dir not in sys.path:
    sys.path.insert(0, core_dir)

# 4. Now import prompts directly
try:
    import prompts
    print("✅ Successfully linked to backend/core/prompts.py")
except ImportError:
    print(f"❌ Error: Could not find prompts.py in {core_dir}")
    sys.exit(1)

from google import genai

# Setup the client - ensure your GOOGLE_API_KEY is set in your terminal
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("ERROR: GOOGLE_API_KEY not found in environment variables.")
    sys.exit(1)

client = genai.Client(api_key=api_key)

def generate_legal_response(query, retrieved_docs):
    """
    Combines retrieved law context with the user query to generate 
    a cited legal answer via Gemini Flash.
    """
    # 1. Combine retrieved documents into one string
    context_text = "\n\n".join(retrieved_docs)
    
    # 2. Build the full prompt
    final_prompt = f"{prompts.SYSTEM_PROMPT}\n\nUser Question: {query}\n\nContext:\n{context_text}"
    
    # 3. Call the Gemini API
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=final_prompt
        )
        return response.text
    except Exception as e:
        return f" API Error: {str(e)}"

if __name__ == "__main__":
    # --- MANUAL TEST CASE ---
    # This runs ONLY when you execute this file directly
    print("Running test query...")
    test_docs = ["Section 185: Drunk driving fine is 10,000 INR."]
    result = generate_legal_response("What is the drunk driving fine?", test_docs)
    print("-" * 30)
    print(result)