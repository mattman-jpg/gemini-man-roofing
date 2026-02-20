import stripe
import os
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def setup_stripe_products():
    print("Setting up Stripe Products for Gemini Man Roofing...")
    
    try:
        # Check if product exists to avoid duplicates (naive check)
        # In a real app we'd store the product ID
        
        # 1. Lead Deposit / Marketing Fee
        product = stripe.Product.create(
            name="Roofing Job Lead Deposit",
            description="Deposit to secure the roofing lead assignment. 50% profit share agreement applies.",
            metadata={"category": "service_fee"}
        )
        
        price = stripe.Price.create(
            unit_amount=50000, # $500.00
            currency="usd",
            product=product.id,
        )
        
        print(f"Created Product: {product.name}")
        print(f"   Product ID: {product.id}")
        print(f"   Price ID: {price.id} ($500.00)")
        
        # Save this Price ID to env or config for the app to use
        # For this script, we'll just output it for the user to copy or we can append to .env programmatically if we were bold.
        # Let's save it to a config file.
        
        with open("stripe_config.json", "w") as f:
            import json
            json.dump({
                "LEAD_DEPOSIT_PRICE_ID": price.id,
                "PRODUCT_ID": product.id
            }, f, indent=4)
            
        print("Configuration saved to stripe_config.json")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    setup_stripe_products()
