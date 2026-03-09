from prompt1 import data_conversion
import subprocess
import re
import json

def get_json_from_prompt(raw_invoice_text:str) -> str:
    prompt = data_conversion(raw_invoice_text)

    # 2. Execute Ollama subprocess
    # Using Llama3 is recommended for better instruction following and JSON formatting.
    process = subprocess.Popen(
        ["ollama", "run", "phi3:3.8b"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8"
    )


    output, error = process.communicate(input=prompt)

    if process.returncode != 0:
        raise RuntimeError(f"Ollama error: {error}")
    
    # 3. Clean the LLM output (Crucial for reliable JSON parsing)
    cleaned_output = output.strip()

    # Use Regex to specifically target and extract content within triple backticks (```json ... ```)
    # This ensures we get the clean JSON string even if the LLM wraps it.
    match = re.search(r"```json\n?(.*?)\n?```", cleaned_output, re.DOTALL)
    if match:
        json_string = match.group(1).strip()
    else:
        # If no markdown block is found, asume the entire output is the JSON
        # Need to strip out any potential stray ``` or text
        json_string = cleaned_output.replace("```", "").strip()

        # 4. convert json string back to python dictionary
        try:
            return json.loads(json_string)
        except json.JSONDecodeError as e:
            print(f"error is {e}")

if __name__ == "__main__":
    SAMPLE_INVOICE_TEXT = """
    Invoice No: INV-12345
    Issue Date: 08/15/2024
    Description: Product shipment, Consulting Fee
    Amount: $1500, $500
    Grand Total: $2000
    """
    result = get_json_from_prompt(SAMPLE_INVOICE_TEXT)
    print(result)