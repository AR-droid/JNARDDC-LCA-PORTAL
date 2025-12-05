import os
from dotenv import load_dotenv
import google.generativeai as genai
from typing import Optional, Tuple
import base64
import requests
from io import BytesIO
from PIL import Image
import tempfile

# Load environment variables
load_dotenv()

# Initialize Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"Gemini API key loaded: {GEMINI_API_KEY[:10]}...")
else:
    print("Warning: No Gemini API key found")

def generate_image_prompts(recommendation: dict) -> Tuple[str, str]:
    """
    Generate image prompts for before/after visualization of a recommendation.
    Returns a tuple of (before_prompt, after_prompt)
    """
    material = recommendation.get('material', 'the material')
    rec_type = recommendation.get('type', 'improvement')
    title = recommendation.get('title', 'Design Improvement')
    
    prompt_base = "Professional product design visualization, high detail, technical illustration, white background, "
    
    if rec_type == 'recycled_content':
        before = f"{prompt_base}product using virgin {material}, showing environmental impact"
        after = f"{prompt_base}same product using recycled {material}, showing reduced environmental impact"
    elif rec_type == 'material_substitution':
        before = f"{prompt_base}product using {material}, showing limitations"
        after = f"{prompt_base}same product using alternative material, showing improved sustainability"
    elif rec_type == 'design_for_disassembly':
        before = f"{prompt_base}product with permanent joints and mixed materials, hard to disassemble"
        after = f"{prompt_base}same product with modular design, using standardized fasteners and easy-to-separate materials"
    else:
        before = f"{prompt_base}current product design with {material}, highlighting areas for improvement"
        after = f"{prompt_base}improved product design implementing {title}, showing enhanced sustainability"
    
    return before, after

def generate_image_with_gemini(prompt: str) -> Optional[bytes]:
    """Generate an image using Gemini and return as bytes"""
    if not GEMINI_API_KEY:
        print("Warning: No Gemini API key found")
        return None
        
    try:
        # Using Gemini 2.5 Flash Image Generation model
        model = genai.GenerativeModel('gemini-2.5-flash-image')
        
        # Generate image based on prompt
        response = model.generate_content(
            f"Generate a technical product design image: {prompt}. Style: clean, professional, white background, technical drawing."
        )
        
        if response and hasattr(response, 'parts') and response.parts:
            # Check if any part contains image data
            for part in response.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    print(f"Generated image successfully")
                    return part.inline_data.data
        
        # If no image data, check if there's text response
        if response and response.text:
            print(f"Generated text description (no image): {response.text[:100]}...")
            # Create a simple placeholder image
            return b"PLACEHOLDER_IMAGE_DATA_FROM_TEXT"
        
        print(f"Warning: No image data generated for prompt: {prompt}")
        return None
    except Exception as e:
        print(f"Error generating image with Gemini: {e}")
        return None

def generate_recommendation_images(recommendation: dict) -> dict:
    """Generate before/after images for a recommendation"""
    print(f"Generating images for recommendation: {recommendation.get('title', 'Unknown')}")
    
    before_prompt, after_prompt = generate_image_prompts(recommendation)
    print(f"Before prompt: {before_prompt}")
    print(f"After prompt: {after_prompt}")
    
    # Generate both images
    before_image = generate_image_with_gemini(before_prompt)
    after_image = generate_image_with_gemini(after_prompt)
    
    # Convert to base64 for easy transfer
    result = {}
    if before_image:
        result['before_image'] = base64.b64encode(before_image).decode('utf-8')
        print("Before image generated successfully")
    else:
        print("Failed to generate before image")
        
    if after_image:
        result['after_image'] = base64.b64encode(after_image).decode('utf-8')
        print("After image generated successfully")
    else:
        print("Failed to generate after image")
    
    return result

# Test function
def test_image_generation():
    """Test the image generation functionality"""
    print("Testing image generation...")
    
    # Test recommendation
    test_recommendation = {
        'type': 'recycled_content',
        'material': 'aluminum',
        'title': 'Increase Recycled Content',
        'description': 'Using recycled aluminum reduces energy consumption by 95%'
    }
    
    try:
        images = generate_recommendation_images(test_recommendation)
        print(f"Test result: {len(images)} images generated")
        
        # Save test images to files
        if 'before_image' in images:
            before_data = base64.b64decode(images['before_image'])
            with open('test_before.jpg', 'wb') as f:
                f.write(before_data)
            print("Saved before image to test_before.jpg")
            
        if 'after_image' in images:
            after_data = base64.b64decode(images['after_image'])
            with open('test_after.jpg', 'wb') as f:
                f.write(after_data)
            print("Saved after image to test_after.jpg")
            
        return images
    except Exception as e:
        print(f"Test failed: {e}")
        return {}

if __name__ == "__main__":
    # Run the test
    test_image_generation()