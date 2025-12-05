import os
from dotenv import load_dotenv
from typing import Optional, Tuple
import base64
from io import BytesIO

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_CONFIGURED = False
genai_client = None

# Try to import and configure the NEW google-genai SDK for image generation
try:
    from google import genai
    from google.genai import types
    
    if GEMINI_API_KEY:
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        GEMINI_CONFIGURED = True
        print(f"✅ Gemini API configured successfully (google-genai SDK)")
    else:
        print("⚠️ Warning: No Gemini API key found")
except ImportError:
    print("⚠️ google-genai SDK not installed. Installing...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'google-genai'])
    try:
        from google import genai
        from google.genai import types
        if GEMINI_API_KEY:
            genai_client = genai.Client(api_key=GEMINI_API_KEY)
            GEMINI_CONFIGURED = True
            print(f"✅ Gemini API configured successfully after install")
    except Exception as e:
        print(f"⚠️ Failed to configure Gemini: {e}")


def generate_image_prompts(recommendation: dict) -> Tuple[str, str]:
    """
    Generate image prompts for before/after visualization of a recommendation.
    Returns a tuple of (before_prompt, after_prompt)
    """
    material = recommendation.get('material', 'metal component')
    rec_type = recommendation.get('type', 'improvement')
    title = recommendation.get('title', 'Design Improvement')
    
    if rec_type == 'recycled_content':
        before = f"Technical illustration of industrial product made with virgin {material}, showing raw material extraction process, smoke stacks, mining, high energy consumption. Professional engineering diagram style, labeled components, white background."
        after = f"Technical illustration of same industrial product made with recycled {material}, showing circular economy flow, green energy, recycling symbols, reduced emissions. Professional engineering diagram style, eco-friendly colors, white background."
    elif rec_type == 'material_substitution':
        before = f"Technical cross-section diagram of product using heavy {material}, showing material density, weight indicators, carbon footprint metrics. Engineering blueprint style."
        after = f"Technical cross-section diagram of product using lightweight sustainable alternative material, showing improved specifications, weight reduction, lower environmental impact. Engineering blueprint style with green accents."
    elif rec_type == 'design_for_disassembly':
        before = f"Exploded view technical drawing of product with welded joints, mixed materials, permanent assembly. Red X marks on non-recyclable connections. Engineering style."
        after = f"Exploded view technical drawing of modular product with snap-fit joints, standardized fasteners, easy-to-separate components. Green checkmarks on recyclable connections. Engineering style."
    else:
        before = f"Technical product visualization showing current {material} design with areas marked for improvement. Industrial engineering diagram, annotations showing inefficiencies."
        after = f"Technical product visualization implementing {title}, showing optimized design with sustainability improvements highlighted in green. Clean engineering diagram."
    
    return before, after


def generate_image_with_gemini(prompt: str) -> Optional[bytes]:
    """Generate an image using Gemini 2.5 Flash Image model"""
    if not GEMINI_CONFIGURED or not genai_client:
        print("⚠️ Gemini not configured for image generation")
        return None
        
    try:
        print(f"🎨 Generating image with prompt: {prompt[:100]}...")
        
        # Use Gemini 2.5 Flash Image model for image generation
        response = genai_client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE']
            )
        )
        
        # Check response for image data
        if response and hasattr(response, 'candidates') and response.candidates:
            for candidate in response.candidates:
                if hasattr(candidate, 'content') and candidate.content:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            print("✅ Image generated successfully")
                            return part.inline_data.data
        
        # Alternative: Check parts directly
        if response and hasattr(response, 'parts'):
            for part in response.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    print("✅ Image generated successfully (from parts)")
                    return part.inline_data.data
                    
        print("⚠️ No image data in response, generating placeholder")
        return None
        
    except Exception as e:
        print(f"❌ Error generating image with Gemini: {e}")
        return None


def create_placeholder_image(title: str, description: str, is_before: bool = True) -> bytes:
    """Create a professional placeholder image with text when Gemini fails"""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        # Return a minimal placeholder if PIL not available
        return b''
    
    # Create image
    width, height = 600, 400
    
    # Colors
    if is_before:
        bg_color = (254, 226, 226)  # Light red for "before"
        accent_color = (220, 38, 38)  # Red
        label = "CURRENT DESIGN"
    else:
        bg_color = (220, 252, 231)  # Light green for "after"
        accent_color = (22, 163, 74)  # Green
        label = "RECOMMENDED DESIGN"
    
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a font, fall back to default
    try:
        title_font = ImageFont.truetype("arial.ttf", 24)
        label_font = ImageFont.truetype("arial.ttf", 16)
        desc_font = ImageFont.truetype("arial.ttf", 14)
    except:
        title_font = ImageFont.load_default()
        label_font = title_font
        desc_font = title_font
    
    # Draw header bar
    draw.rectangle([(0, 0), (width, 50)], fill=accent_color)
    
    # Draw label
    draw.text((20, 15), label, fill='white', font=label_font)
    
    # Draw title
    title_wrapped = title[:50] + "..." if len(title) > 50 else title
    draw.text((20, 70), title_wrapped, fill=(31, 41, 55), font=title_font)
    
    # Draw description (wrap text)
    y_pos = 120
    words = description.split()
    line = ""
    for word in words:
        test_line = line + word + " "
        if len(test_line) > 60:
            draw.text((20, y_pos), line.strip(), fill=(75, 85, 99), font=desc_font)
            y_pos += 25
            line = word + " "
            if y_pos > 300:
                break
        else:
            line = test_line
    if line and y_pos <= 300:
        draw.text((20, y_pos), line.strip(), fill=(75, 85, 99), font=desc_font)
    
    # Draw decorative elements
    draw.rectangle([(0, height - 5), (width, height)], fill=accent_color)
    
    # Save to bytes
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.read()


def generate_recommendation_images(recommendation: dict) -> dict:
    """Generate before/after images for a recommendation"""
    print(f"🔄 Generating images for recommendation: {recommendation.get('title', 'Unknown')}")
    
    title = recommendation.get('title', 'Design Recommendation')
    before_prompt, after_prompt = generate_image_prompts(recommendation)
    
    result = {}
    
    # Try to generate real images with Gemini
    before_image = generate_image_with_gemini(before_prompt)
    after_image = generate_image_with_gemini(after_prompt)
    
    # Fall back to placeholders if Gemini fails
    if before_image:
        result['before_image'] = base64.b64encode(before_image).decode('utf-8')
    else:
        fallback = create_placeholder_image(
            title, 
            f"Current design visualization for {recommendation.get('material', 'material')}",
            is_before=True
        )
        result['before_image'] = base64.b64encode(fallback).decode('utf-8')
    
    if after_image:
        result['after_image'] = base64.b64encode(after_image).decode('utf-8')
    else:
        fallback = create_placeholder_image(
            title,
            f"Improved design after implementing {title}",
            is_before=False
        )
        result['after_image'] = base64.b64encode(fallback).decode('utf-8')
    
    print("✅ Image generation complete")
    return result


# Test function
def test_image_generation():
    """Test the image generation functionality"""
    print("\n" + "="*50)
    print("Testing Gemini Image Generation")
    print("="*50)
    print(f"API Key configured: {GEMINI_CONFIGURED}")
    print(f"Client initialized: {genai_client is not None}")
    
    # Test recommendation
    test_recommendation = {
        'type': 'recycled_content',
        'material': 'aluminum',
        'title': 'Increase Recycled Aluminum Content',
        'description': 'Using recycled aluminum reduces energy consumption by 95%'
    }
    
    try:
        images = generate_recommendation_images(test_recommendation)
        print(f"\n✅ Test result: {len(images)} images generated")
        
        # Save test images to files
        if 'before_image' in images:
            before_data = base64.b64decode(images['before_image'])
            with open('test_before.png', 'wb') as f:
                f.write(before_data)
            print(f"   Saved before image ({len(before_data)} bytes)")
            
        if 'after_image' in images:
            after_data = base64.b64decode(images['after_image'])
            with open('test_after.png', 'wb') as f:
                f.write(after_data)
            print(f"   Saved after image ({len(after_data)} bytes)")
            
        return images
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return {}


if __name__ == "__main__":
    test_image_generation()
