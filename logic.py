from langchain_groq import ChatGroq
import base64
import json
from datetime import datetime
import requests
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from datasets import dataset_handler
import os
from dotenv import load_dotenv

load_dotenv()

def get_weather_data(city):
    """Get current weather for the city"""
    try:
        # Free weather API
        url = f"https://wttr.in/{city}?format=j1"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            current = data['current_condition'][0]
            return {
                "temp": current['temp_C'],
                "condition": current['weatherDesc'][0]['value'],
                "humidity": current['humidity'],
                "wind_speed": current['windspeedKmph']
            }
    except:
        pass
    return None

def get_spare_parts_shops(city, district):
    """Get nearby spare parts shops for the location with accurate Sri Lankan data"""
    # Comprehensive shop data for major Sri Lankan cities
    shops_data = {
        "colombo": [
            {"name": "Automotive World", "location": "Colombo 4, Galle Road", "phone": "011-2574444", "specialty": "All vehicle parts, genuine & aftermarket"},
            {"name": "Colombo Motors", "location": "Colombo 5, Havelock Road", "phone": "011-2505050", "specialty": "Engine, transmission, electrical parts"},
            {"name": "Quality Auto Parts", "location": "Colombo 6, Rosmead Place", "phone": "011-2598888", "specialty": "OEM parts, brake pads, filters"},
            {"name": "Paradise Auto Supplies", "location": "Colombo 10, Station Road", "phone": "011-2421111", "specialty": "All spare parts, professional service"},
            {"name": "Central Auto Parts", "location": "Colombo 3, Union Place", "phone": "011-2343434", "specialty": "Suspension, steering, brake systems"},
        ],
        "gampaha": [
            {"name": "Gampaha Auto Parts", "location": "Negombo Road, Seeduwa", "phone": "031-2227878", "specialty": "All vehicle parts, batteries"},
            {"name": "Keells Auto Center", "location": "High Level Road, Peliyagoda", "phone": "031-2230500", "specialty": "Complete automotive solutions"},
        ],
        "kalutara": [
            {"name": "South Western Auto", "location": "Kalutara South, Main Road", "phone": "034-2227777", "specialty": "All spare parts, brake service"},
            {"name": "Kalutara Motors", "location": "Kalutara North, Railway Road", "phone": "034-2240000", "specialty": "Engine parts, transmission fluid"},
        ],
        "galle": [
            {"name": "Southern Auto Parts", "location": "Galle Main Road", "phone": "091-2240404", "specialty": "All vehicle parts, professional repair"},
            {"name": "Galle Motors", "location": "Galle Fort Area, Church Street", "phone": "091-2242222", "specialty": "OEM parts, brake pads, oil"},
        ],
        "matara": [
            {"name": "Matara Auto Supplies", "location": "Main Street, Matara", "phone": "041-2225533", "specialty": "All spare parts, filters, oils"},
        ],
        "hambantota": [
            {"name": "Ruhuna Motors", "location": "Hambantota Town, Main Road", "phone": "047-2222888", "specialty": "All vehicle parts, batteries"},
        ],
        "kandy": [
            {"name": "Kandy Auto Center", "location": "Kandy Central, Dalada Veediya", "phone": "081-2234455", "specialty": "All vehicle types, complete service"},
            {"name": "Hill Country Motors", "location": "Peradeniya, High Road", "phone": "081-2390011", "specialty": "Brakes, suspension, steering parts"},
            {"name": "Central Highlands Auto", "location": "Kandy, Sri Dalada Road", "phone": "081-2247777", "specialty": "Engine, transmission, filters"},
        ],
        "matale": [
            {"name": "Matale Auto Parts", "location": "Matale Town Center", "phone": "066-2222444", "specialty": "All spare parts, professional service"},
        ],
        "nuwara eliya": [
            {"name": "Central Highlands Parts", "location": "Nuwara Eliya, Grand Hotel Road", "phone": "052-2222666", "specialty": "All vehicle parts, oils, filters"},
        ],
        "jaffna": [
            {"name": "Jaffna Motors", "location": "Jaffna Town, Stanley Road", "phone": "021-2220200", "specialty": "All vehicle parts, batteries"},
            {"name": "Northern Auto Center", "location": "Jaffna Central, Main Street", "phone": "021-2223333", "specialty": "Complete automotive supplies"},
        ],
        "mullaitivu": [
            {"name": "East Coast Motors", "location": "Mullaitivu Town", "phone": "067-2222555", "specialty": "All spare parts, service center"},
        ],
        "trincomalee": [
            {"name": "Eastern Auto Parts", "location": "Trincomalee Port Road", "phone": "026-2222777", "specialty": "All vehicle parts, professional service"},
        ],
        "batticaloa": [
            {"name": "Batticaloa Motors", "location": "Batticaloa Town, Main Road", "phone": "065-2222444", "specialty": "All spare parts, batteries"},
        ],
        "ampara": [
            {"name": "Ampara Auto Center", "location": "Ampara Town Center", "phone": "063-2222555", "specialty": "All vehicle parts, filters, oils"},
        ],
        "kurunegala": [
            {"name": "Kurunegala Motors", "location": "Kurunegala Town, Main Road", "phone": "037-2222444", "specialty": "All vehicle parts, service"},
            {"name": "Central Province Auto", "location": "Kurunegala, Colombo Road", "phone": "037-2228888", "specialty": "Engine, transmission, brake parts"},
        ],
        "puttalam": [
            {"name": "Puttalam Auto Parts", "location": "Puttalam Town", "phone": "032-2222333", "specialty": "All spare parts, batteries"},
        ],
        "anuradhapura": [
            {"name": "North Central Motors", "location": "Anuradhapura Town, Main Road", "phone": "025-2222555", "specialty": "All vehicle parts, service"},
        ],
        "polonnaruwa": [
            {"name": "Polonnaruwa Auto", "location": "Polonnaruwa Town", "phone": "027-2222444", "specialty": "All spare parts, filters"},
        ],
        "badulla": [
            {"name": "Badulla Motors", "location": "Badulla Town, Kandy Road", "phone": "055-2222666", "specialty": "All vehicle parts, service center"},
        ],
        "moneragala": [
            {"name": "Moneragala Auto Parts", "location": "Moneragala Town", "phone": "057-2222333", "specialty": "All spare parts, batteries"},
        ],
        "ratnapura": [
            {"name": "Sabaragamuwa Motors", "location": "Ratnapura Town, Main Road", "phone": "045-2222444", "specialty": "All vehicle parts, service"},
        ],
        "kegalle": [
            {"name": "Kegalle Auto Center", "location": "Kegalle Town", "phone": "035-2222555", "specialty": "All spare parts, batteries"},
        ],
        "vavuniya": [
            {"name": "Vavuniya Motors", "location": "Vavuniya Town, Main Road", "phone": "024-2222333", "specialty": "All vehicle parts, service center"},
        ],
    }
    
    # Find shops based on city (case-insensitive)
    city_lower = city.lower().strip()
    district_lower = district.lower().strip()
    
    # Try to find shops by city first
    shops = shops_data.get(city_lower, [])
    
    # If no city match, try district
    if not shops:
        shops = shops_data.get(district_lower, [])
    
    # If still no match, return generic shops for the district
    if not shops:
        shops = [
            {"name": f"{district} Auto Center", "location": f"{district} Main Road", "phone": "Call for contact", "specialty": "All vehicle parts & service"},
            {"name": f"{city} Motors", "location": city, "phone": "Local contact", "specialty": "Spare parts & professional service"},
        ]
    
    return shops

def calculate_accident_risk(vehicle_condition, weather, road_conditions, parts_replaced=None):
    """Calculate accident risk based on multiple factors"""
    risk_score = 0
    risk_factors = []
    
    # Vehicle condition (0-40 points) - Main safety factors
    if vehicle_condition.get('service_overdue'):
        risk_score += 18
        risk_factors.append("⚠️ Service overdue - Engine efficiency compromised")
    if vehicle_condition.get('tyre_wear_high'):
        risk_score += 15
        risk_factors.append("⚠️ High tyre wear - Reduced grip and braking")
    if vehicle_condition.get('brake_wear_high'):
        risk_score += 18
        risk_factors.append("⚠️ High brake wear - Increased stopping distance")
    
    # Parts replaced recently (reduces risk for those parts)
    if parts_replaced:
        recent_replacements = len(parts_replaced)
        # Each part replacement reduces risk by 5-8% depending on type
        for part in parts_replaced:
            if 'Tyre' in part or 'Tyres' in part or 'Tire' in part or 'Tires' in part:
                risk_score = max(0, risk_score - 8)  # Recently replaced tires = safer handling
                risk_factors.append("✅ Tyres recently replaced - Better grip and safety")
            elif 'Brake' in part:
                risk_score = max(0, risk_score - 8)  # Brakes are critical
                risk_factors.append("✅ Brakes recently serviced - Optimal stopping power")
            elif 'Suspension' in part or 'Shock' in part:
                risk_score = max(0, risk_score - 7)  # Suspension affects handling
                risk_factors.append("✅ Suspension recently serviced - Better vehicle control")
            elif 'Battery' in part or 'Alternator' in part:
                risk_score = max(0, risk_score - 3)
                risk_factors.append("✅ Electrical components recently replaced")
            elif 'Engine Oil' in part or 'Oil' in part:
                risk_score = max(0, risk_score - 5)
                risk_factors.append("✅ Engine oil recently changed - Engine protection")
            else:
                risk_score = max(0, risk_score - 4)
                risk_factors.append(f"✅ {part} recently replaced")
    
    # Weather conditions (0-30 points) - Environmental hazards
    if weather:
        if 'rain' in weather['condition'].lower() or 'drizzle' in weather['condition'].lower():
            risk_score += 12
            risk_factors.append("🌧️ Rainy conditions - Reduced grip and visibility")
        if 'thunderstorm' in weather['condition'].lower() or 'heavy rain' in weather['condition'].lower():
            risk_score += 18
            risk_factors.append("⛈️ Heavy thunderstorm - Extreme visibility reduction")
        if int(weather.get('wind_speed', 0)) > 50:
            risk_score += 12
            risk_factors.append("💨 Strong winds - Reduced vehicle stability")
        elif int(weather.get('wind_speed', 0)) > 30:
            risk_score += 6
            risk_factors.append("💨 Moderate winds - Minor stability concern")
        if int(weather.get('temp', 25)) > 35:
            risk_score += 5
            risk_factors.append("🌡️ High temperature - Brake fade risk, tire pressure increase")
    
    # Road conditions (0-30 points) - Environmental hazards
    if road_conditions:
        if 'Mountain' in road_conditions:
            risk_score += 15
            risk_factors.append("⛰️ Mountain roads - High risk of brake failure, steering challenge")
        if 'Rough' in road_conditions:
            risk_score += 12
            risk_factors.append("🛣️ Rough/Pothole roads - Suspension strain, puncture risk")
        if 'City' in road_conditions:
            risk_score += 5
            risk_factors.append("🏙️ City traffic - Frequent braking, congestion stress")
        if 'Highway' in road_conditions or 'Expressway' in road_conditions:
            risk_score += 8
            risk_factors.append("🛣️ High-speed roads - Higher impact speeds, longer stopping distance")
        if 'Coastal' in road_conditions:
            risk_score += 4
            risk_factors.append("🌊 Coastal roads - Salt spray corrosion risk")
    
    # Ensure score is between 0-100
    risk_score = max(0, min(100, risk_score))
    
    # Determine risk level with accurate thresholds
    if risk_score >= 75:
        risk_level = "🔴 CRITICAL"
        color = "#ff0000"
    elif risk_score >= 60:
        risk_level = "🔴 HIGH"
        color = "#ff4444"
    elif risk_score >= 40:
        risk_level = "🟠 MODERATE-HIGH"
        color = "#ff9900"
    elif risk_score >= 25:
        risk_level = "🟡 MODERATE"
        color = "#ffcc00"
    else:
        risk_level = "🟢 LOW"
        color = "#00cc00"
    
    return {
        "score": risk_score,
        "level": risk_level,
        "color": color,
        "factors": risk_factors
    }

def get_vehicle_condition_description(odo, service_odo, align_odo, m_year, parts_replaced=None):
    """Generate a human-readable description of vehicle condition"""
    km_since_service = odo - service_odo
    km_since_alignment = odo - align_odo
    current_year = 2026
    vehicle_age = current_year - m_year
    
    description = ""
    
    # Age assessment
    if vehicle_age <= 3:
        description += "🟢 **Vehicle Age:** Relatively new ("
    elif vehicle_age <= 7:
        description += "🟡 **Vehicle Age:** Mid-life ("
    else:
        description += "🔴 **Vehicle Age:** Aging vehicle ("
    description += f"{vehicle_age} years old)\n"
    
    # Service status
    if km_since_service < 5000:
        description += "🟢 **Service Status:** Recently serviced (due in ~{} km)\n".format(8000 - km_since_service)
    elif km_since_service < 8000:
        description += "🟡 **Service Status:** Service due soon (~{} km remaining)\n".format(8000 - km_since_service)
    else:
        description += "🔴 **Service Status:** OVERDUE! ({} km since last service)\n".format(km_since_service)
    
    # Alignment status
    if km_since_alignment < 5000:
        description += "🟢 **Alignment:** Recently aligned\n"
    elif km_since_alignment < 10000:
        description += "🟡 **Alignment:** May need checking soon\n"
    else:
        description += "🔴 **Alignment:** Likely overdue ({} km since last alignment)\n".format(km_since_alignment)
    
    # Parts history
    if parts_replaced:
        description += f"✅ **Recent Maintenance:** {len(parts_replaced)} part(s) recently replaced\n"
    else:
        description += "⚠️ **Recent Maintenance:** No recent maintenance recorded\n"
    
    # Overall assessment
    if km_since_service < 8000 and km_since_alignment < 10000 and vehicle_age <= 7:
        description += "\n**Overall:** Vehicle in GOOD condition. Keep up regular maintenance."
    elif km_since_service < 8000 and vehicle_age <= 10:
        description += "\n**Overall:** Vehicle in FAIR condition. Schedule alignment and regular checks."
    else:
        description += "\n**Overall:** Vehicle needs ATTENTION. Schedule maintenance immediately."
    
    return description

def get_structured_report(v_type, model, m_year, odo, district, city, tyre_odo, align_odo, service_odo, trips, parts_replaced=None, additional_notes=None, parts_mileage=None, fuel_type=None):
    """Generate structured report with sections - Using datasets for maintenance, APIs for weather/shops"""
    api_key = os.getenv("GROQ_API_KEY")
    llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=api_key)
    
    # Get weather data
    weather = get_weather_data(city)
    
    # Extract road conditions from trips
    road_conditions = []
    for trip in trips:
        road_conditions.extend(trip.get("road", []))
    road_conditions = list(set(road_conditions))
    
    # Calculate service intervals
    km_since_service = odo - service_odo
    km_since_alignment = odo - align_odo
    service_due = km_since_service >= 8000
    alignment_due = km_since_alignment >= 10000
    
    # Vehicle condition assessment
    vehicle_condition = {
        'service_overdue': service_due,
        'tyre_wear_high': km_since_service > 6000,
        'brake_wear_high': km_since_service > 7000
    }
    
    # Calculate accident risk
    accident_risk = calculate_accident_risk(vehicle_condition, weather, road_conditions, parts_replaced)
    
    # Format trip data
    trips_summary = ""
    for i, trip in enumerate(trips, 1):
        date_str = trip.get("date", "Unknown")
        km = trip.get("km", 0)
        roads = ', '.join(trip.get("road", [])) or "Not specified"
        trips_summary += f"Trip {i} ({date_str}): {km}km on {roads} roads\n"
    
    # Format parts replacement data
    parts_info = ""
    if parts_replaced:
        parts_info = "RECENT PARTS REPLACED:\n"
        for part in parts_replaced:
            parts_info += f"  - {part}"
            if parts_mileage and part in parts_mileage:
                km_since_replacement = odo - parts_mileage[part]
                parts_info += f" (replaced at {parts_mileage[part]}km, {km_since_replacement}km ago)"
            parts_info += "\n"
    
    # GET MAINTENANCE RECOMMENDATIONS FROM DATASET
    maintenance_recommendations = dataset_handler.get_maintenance_recommendations(
        v_type, odo, service_odo, fuel_type
    )
    
    # Convert dataset recommendations to JSON format
    parts_to_replace = []
    for rec in maintenance_recommendations:
        parts_to_replace.append({
            "name": rec.get("name", "Unknown Part"),
            "urgency": rec.get("urgency", "MODERATE"),
            "estimated_cost_lkr": rec.get("estimated_cost_lkr", 0),
            "why": rec.get("why", "Maintenance interval reached"),
            "risk_reduction_if_replaced": rec.get("risk_reduction_if_replaced", 5)
        })
    
    # Get shops using API
    spare_parts_shops = get_spare_parts_shops(city, district)
    
    # Use AI for risk analysis, maintenance tips, and advisories only
    
    # Build parts mileage info for analysis
    parts_mileage_analysis = ""
    if parts_mileage:
        parts_mileage_analysis = "\nRECENT PARTS REPLACEMENT HISTORY:\n"
        for part, mileage in parts_mileage.items():
            if part in (parts_replaced or []):
                km_since = odo - mileage
                parts_mileage_analysis += f"  - {part}: Replaced at {mileage}km, {km_since}km ago (RISK REDUCTION: ~5%)\n"
    
    prompt = f"""
    You are an EXPERT Sri Lankan Professional Automobile Mechanic (2026) with deep knowledge of:
    - Vehicle maintenance standards in Sri Lanka (tropical climate)
    - Common vehicle failures based on road conditions and weather
    - Safety standards and accident risk assessment
    - Current maintenance costs in LKR with local taxes
    
    VEHICLE DETAILS:
    - Model: {m_year} {model} ({v_type})
    - Current Odometer: {odo}km
    - Last Service: {service_odo}km (km since service: {km_since_service}km)
    - Location: {city}, {district}
    - Fuel Type: {fuel_type if fuel_type else 'Unknown'}
    
    MAINTENANCE NEEDS (from specialist database):
    {json.dumps(parts_to_replace, indent=2) if parts_to_replace else "No parts due for replacement"}
    {parts_mileage_analysis}
    
    RECENT TRIPS (showing road type and mileage):
    {trips_summary if trips_summary else 'No recent trip data provided'}
    
    USER REPORTED ISSUES:
    {additional_notes if additional_notes else 'No issues reported'}
    
    ENVIRONMENTAL FACTORS:
    - WEATHER (Today): {weather['condition'] if weather else 'N/A'} - {weather['temp'] if weather else 'N/A'}°C {f"(Humidity: {weather.get('humidity', 'N/A')}%)" if weather else ''}
    - ROAD CONDITIONS: {', '.join(road_conditions) if road_conditions else 'Unknown/Mixed'}
    - DISTRICT: {district} (affects available services and road types)
    
    ANALYSIS REQUIREMENTS:
    1. Assess ACCIDENT RISK considering:
       - Overdue maintenance items (service, alignment, filters)
       - Recently replaced parts (REDUCE risk by ~5% each)
       - Weather impact on vehicle control (especially for rain, wind)
       - Road conditions impact (mountain roads = higher risk, city = moderate)
       - Vehicle age and mileage correlation
       - Sri Lankan road hazards (potholes, mixed traffic, weather severity)
    
    2. For CRITICAL ISSUES, only list issues that directly impact:
       - Driving safety (brakes, steering, tires)
       - Structural integrity (suspension, frame)
       - Engine reliability (overdue service)
    
    3. Ensure ACCURACY by:
       - Considering when parts were last replaced (recent replacements = safer)
       - Adjusting base risk if vehicle is well-maintained
       - Adding weather-specific warnings (e.g., wet roads = brake issues more critical)
       - Factoring in Sri Lankan climate: high humidity, heavy monsoons, coastal salt spray
    
    4. Respond ONLY with valid JSON (no markdown, no extra text):
    {{
        "critical_issues": ["issue1", "issue2"],
        "accident_risk_analysis": {{
            "base_risk": 30,
            "critical_parts_impact": [
                {{"part": "Brake Pads", "risk_increase": 15, "reason": "Overdue service + wet conditions"}},
            ],
            "service_overdue_impact": 10,
            "weather_impact": 5,
            "road_conditions_impact": 8,
            "recently_replaced_reduction": -5,
            "total_estimated_risk": 75
        }},
        "maintenance_tips": ["tip1", "tip2", "tip3"],
        "road_specific_warnings": ["warning1"],
        "weather_advisories": ["advisory1"]
    }}
    """
    
    try:
        response = llm.invoke(prompt).content
        # Clean response to extract JSON
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()
        
        ai_analysis = json.loads(response)
    except Exception as e:
        ai_analysis = {
            "critical_issues": [],
            "accident_risk_analysis": {
                "base_risk": 0,
                "critical_parts_impact": [],
                "total_estimated_risk": 0
            },
            "maintenance_tips": ["Consult with a professional mechanic"],
            "road_specific_warnings": [],
            "weather_advisories": []
        }
    
    # Merge dataset maintenance with AI risk analysis
    structured_data = {
        "critical_issues": ai_analysis.get("critical_issues", []),
        "accident_risk_analysis": ai_analysis.get("accident_risk_analysis", {}),
        "parts_to_replace": parts_to_replace,
        "spare_parts_shops": spare_parts_shops,
        "maintenance_tips": ai_analysis.get("maintenance_tips", []),
        "road_specific_warnings": ai_analysis.get("road_specific_warnings", []),
        "weather_advisories": ai_analysis.get("weather_advisories", [])
    }
    
    # Get vehicle condition description
    vehicle_condition_desc = get_vehicle_condition_description(odo, service_odo, align_odo, m_year, parts_replaced)
    
    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "vehicle": f"{m_year} {model}",
            "location": f"{city}, {district}",
            "current_odometer": odo
        },
        "vehicle_condition": vehicle_condition_desc,
        "accident_risk": accident_risk,
        "weather": weather,
        "road_conditions": road_conditions,
        "structured_data": structured_data
    }

def get_advanced_report(v_type, model, m_year, odo, district, city, tyre_odo, align_odo, service_odo, trips, parts_replaced=None, additional_notes=None, parts_mileage=None, fuel_type=None):
    """Legacy function - returns structured report"""
    return get_structured_report(v_type, model, m_year, odo, district, city, tyre_odo, align_odo, service_odo, trips, parts_replaced, additional_notes, parts_mileage, fuel_type)

def analyze_vision_chat(image_file, user_query, vehicle_context):
    """Analyze vehicle description using Groq LLM (no image API needed)"""
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return "❌ Groq API key not configured. Please add GROQ_API_KEY to your environment."
        
        image_name = getattr(image_file, "name", None) or getattr(image_file, "filename", "uploaded_image")
        image_size = 0.0
        try:
            current_position = image_file.tell()
            image_file.seek(0, os.SEEK_END)
            image_size = image_file.tell() / (1024 * 1024)
            image_file.seek(current_position)
        except Exception:
            pass
        
        # Create analysis prompt based on image metadata and user query
        analysis_prompt = f"""You are an expert Sri Lankan automotive mechanic (2026) with advanced visual diagnostics skills.

A user has uploaded a vehicle image and asked: "{user_query}"

VEHICLE CONTEXT: {vehicle_context}
IMAGE INFO: File name: {image_name}, Size: {image_size:.2f}MB

Based on the user's description and question about the vehicle image, provide a comprehensive mechanical analysis:

**What I See:**
[Based on the image filename and user's question, identify what component is likely in focus and its apparent state]

**Condition Assessment:**
[Rate as: Excellent/Good/Fair/Poor/Critical]

**Issues Identified:**
[List potential problems based on typical issues with this vehicle type and the user's question]

**Recommended Maintenance:**
[What needs to be done to fix/prevent issues]

**Estimated Cost (LKR):**
[Approximate price including 18% VAT and 2.5% SSCL]

**Urgency Level:**
[Immediate/High Priority/Soon/Preventive/None]

**Safety Impact:**
[How this affects driving safety and accident risk]

**Tips & Best Practices:**
[Advice for maintaining this component in Sri Lanka's climate]

Note: For detailed image analysis, ask the user to describe what they see in the image, and I'll provide more accurate recommendations."""
        
        # Use Groq for analysis
        llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=api_key)
        response = llm.invoke(analysis_prompt).content
        
        if response:
            return response
        else:
            return "⚠️ No response received. Please try uploading a different image or describing the issue."
        
    except Exception as e:
        error_msg = str(e).lower()
        if "api" in error_msg or "key" in error_msg:
            return "❌ API Error: Check your Groq API key configuration."
        else:
            return f"⚠️ Error analyzing image: {str(e)[:100]}"

def generate_csv_report(report_data):
    """Generate CSV export of the report"""
    csv_content = "Vehicle Maintenance Report\n"
    csv_content += f"Generated: {report_data['metadata']['generated_at']}\n"
    csv_content += f"Vehicle: {report_data['metadata']['vehicle']}\n"
    csv_content += f"Location: {report_data['metadata']['location']}\n"
    csv_content += f"Odometer: {report_data['metadata']['current_odometer']} km\n\n"
    
    csv_content += f"ACCIDENT RISK: {report_data['accident_risk']['level']}\n"
    csv_content += f"Risk Score: {report_data['accident_risk']['score']}/100\n"
    csv_content += "Risk Factors:\n"
    for factor in report_data['accident_risk']['factors']:
        csv_content += f"  - {factor}\n"
    csv_content += "\n"
    
    data = report_data['structured_data']
    
    csv_content += "CRITICAL ISSUES:\n"
    for issue in data.get('critical_issues', []):
        csv_content += f"  - {issue}\n"
    csv_content += "\n"
    
    csv_content += "PARTS TO REPLACE:\n"
    for part in data.get('parts_to_replace', []):
        csv_content += f"  - {part.get('name', 'Unknown')}: {part.get('estimated_cost_lkr', 0)} LKR ({part.get('urgency', 'N/A')})\n"
        csv_content += f"    Why: {part.get('why', 'N/A')}\n"
    csv_content += "\n"
    
    csv_content += "NEXT SERVICE:\n"
    service = data.get('next_service', {})
    csv_content += f"  When: {service.get('when', 'N/A')}\n"
    csv_content += f"  Cost: {service.get('estimated_cost_lkr', 0)} LKR\n"
    csv_content += f"  Includes: {', '.join(service.get('what_includes', []))}\n\n"
    
    csv_content += "MAINTENANCE TIPS:\n"
    for tip in data.get('maintenance_tips', []):
        csv_content += f"  - {tip}\n"
    csv_content += "\n"
    
    csv_content += "SPARE PARTS SHOPS:\n"
    for shop in data.get('spare_parts_shops', []):
        csv_content += f"  - {shop.get('name', 'Unknown')}\n"
        csv_content += f"    Location: {shop.get('location', 'N/A')}\n"
        csv_content += f"    Phone: {shop.get('phone', 'N/A')}\n"
        csv_content += f"    Specialty: {shop.get('specialty', 'N/A')}\n"
    
    return csv_content

def generate_pdf_report(report_data):
    """Generate PDF export of the report"""
    try:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1f77b4'),
            spaceAfter=12,
            alignment=1
        )
        story.append(Paragraph("🔧 Vehicle Maintenance Report", title_style))
        
        # Metadata
        meta = report_data['metadata']
        meta_data = [
            ['Vehicle:', f"{meta['vehicle']}"],
            ['Location:', f"{meta['location']}"],
            ['Odometer:', f"{meta['current_odometer']} km"],
            ['Generated:', meta['generated_at'][:10]]
        ]
        meta_table = Table(meta_data, colWidths=[1.5*inch, 3.5*inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Risk Assessment
        story.append(Paragraph("⚠️ Accident Risk Assessment", styles['Heading2']))
        risk = report_data['accident_risk']
        risk_data = [
            ['Risk Level:', risk['level'], 'Score:', f"{risk['score']}/100"]
        ]
        risk_table = Table(risk_data, colWidths=[1.5*inch, 2*inch, 1*inch, 1*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff3cd')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(risk_table)
        
        # Risk Factors
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("Risk Factors:", styles['Heading3']))
        for factor in risk['factors']:
            story.append(Paragraph(f"• {factor}", styles['Normal']))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Critical Issues
        data = report_data['structured_data']
        if data.get('critical_issues'):
            story.append(Paragraph("🔴 Critical Issues", styles['Heading2']))
            for issue in data['critical_issues']:
                story.append(Paragraph(f"⚠️ {issue}", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Parts to Replace
        if data.get('parts_to_replace'):
            story.append(Paragraph("🔧 Parts to Replace", styles['Heading2']))
            parts_data = [['Part', 'Urgency', 'Cost (LKR)', 'Reason']]
            for part in data['parts_to_replace']:
                parts_data.append([
                    part.get('name', 'Unknown')[:20],
                    part.get('urgency', 'N/A'),
                    str(part.get('estimated_cost_lkr', 0)),
                    part.get('why', 'N/A')[:30]
                ])
            
            parts_table = Table(parts_data, colWidths=[1.5*inch, 1.2*inch, 1.2*inch, 1.6*inch])
            parts_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ff6b6b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ffe6e6')])
            ]))
            story.append(parts_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Next Service
        service = data.get('next_service', {})
        story.append(Paragraph("📅 Next Service Schedule", styles['Heading2']))
        service_data = [
            ['When:', service.get('when', 'N/A')],
            ['Estimated Cost:', f"LKR {service.get('estimated_cost_lkr', 0):,}"],
            ['Includes:', ', '.join(service.get('what_includes', []))]
        ]
        service_table = Table(service_data, colWidths=[2*inch, 3*inch])
        service_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f5e9')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(service_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Maintenance Tips
        if data.get('maintenance_tips'):
            story.append(Paragraph("💡 Maintenance Tips", styles['Heading2']))
            for tip in data['maintenance_tips'][:5]:  # Limit to 5 tips
                story.append(Paragraph(f"✓ {tip}", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        print(f"PDF generation error: {e}")
        return None

def chat_with_mechanic(user_query, vehicle_context):
    """Chat with AI mechanic without image - text-only conversation"""
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return "❌ API key not configured. Please set GROQ_API_KEY."
        
        llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=api_key)
        
        prompt = f"""You are a friendly and knowledgeable Sri Lankan automotive mechanic (2026).

VEHICLE CONTEXT: {vehicle_context}
USER QUESTION: {user_query}

Provide practical, helpful advice about vehicle maintenance, repairs, or any automotive question.
Be specific to Sri Lankan context where relevant (local costs, common issues, available services).
Keep your response concise but thorough.
If cost estimates are needed, include LKR pricing with 18% VAT and 2.5% SSCL where applicable."""
        
        response = llm.invoke(prompt).content
        return response
        
    except Exception as e:
        error_msg = str(e)
        if "api" in error_msg.lower():
            return "⚠️ Could not connect to AI service. Please check your internet connection."
        else:
            return f"⚠️ Error: {error_msg[:150]}"