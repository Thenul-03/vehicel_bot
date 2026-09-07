import os
import pymongo
from dotenv import load_dotenv
from datetime import datetime
import hashlib

# This function safely finds your connection string no matter where the app is running
def get_db_client():
    load_dotenv()
    mongo_uri = os.getenv("MONGO_URI")

    if not mongo_uri:
        # Silently fail - allow app to work with session state
        return None
        
    try:
        # We add 'tlsAllowInvalidCertificates' to help Streamlit Cloud bypass SSL hurdles
        client = pymongo.MongoClient(
            mongo_uri, 
            serverSelectionTimeoutMS=5000,
            tlsAllowInvalidCertificates=True 
        )
        # This line forces a connection check immediately
        client.server_info() 
        return client
    except Exception as e:
        # Silently fail - allow app to work with session state
        return None

def generate_user_id(model, city):
    """Generate unique user ID from vehicle model and city"""
    user_identifier = f"{model.lower().strip()}_{city.lower().strip()}"
    user_hash = hashlib.md5(user_identifier.encode()).hexdigest()[:12]
    return user_hash

def get_or_create_user(model, city, district):
    """Get user by model+city or create new user"""
    client = get_db_client()
    if not client:
        return None
    
    user_id = generate_user_id(model, city)
    db = client["vehicle_bot_db"]
    users = db["users"]
    
    # Try to find existing user
    user = users.find_one({"user_id": user_id})
    
    if not user:
        # Create new user
        user = {
            "user_id": user_id,
            "model": model,
            "city": city,
            "district": district,
            "created_date": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "vehicle_data": {},
            "trips_data": [],
            "history_log": [],
            "changes_log": []
        }
        users.insert_one(user)
    
    return user

def get_user_by_id(user_id):
    """Retrieve user data by user ID"""
    client = get_db_client()
    if not client:
        return None
    
    db = client["vehicle_bot_db"]
    users = db["users"]
    return users.find_one({"user_id": user_id})

def save_user_data(user_id, vehicle_data, trips_data, history_log):
    """Save complete user data to database"""
    client = get_db_client()
    if not client:
        return False
    
    db = client["vehicle_bot_db"]
    users = db["users"]
    
    users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "vehicle_data": vehicle_data,
                "trips_data": trips_data,
                "history_log": history_log,
                "last_updated": datetime.now().isoformat()
            }
        }
    )
    return True

def update_service_odometer(user_id, new_service_odo):
    """Update service odometer and track change"""
    client = get_db_client()
    if not client:
        return False
    
    db = client["vehicle_bot_db"]
    users = db["users"]
    
    # Get current value
    user = users.find_one({"user_id": user_id})
    old_value = user["vehicle_data"].get("s_odo", 0) if user else 0
    
    # Update and log change
    users.update_one(
        {"user_id": user_id},
        {
            "$set": {"vehicle_data.s_odo": new_service_odo},
            "$push": {
                "changes_log": {
                    "timestamp": datetime.now().isoformat(),
                    "field": "last_service_odometer",
                    "old_value": old_value,
                    "new_value": new_service_odo,
                    "changed_by": "user_update"
                }
            }
        }
    )
    return True

def update_alignment_odometer(user_id, new_align_odo):
    """Update alignment odometer and track change"""
    client = get_db_client()
    if not client:
        return False
    
    db = client["vehicle_bot_db"]
    users = db["users"]
    
    # Get current value
    user = users.find_one({"user_id": user_id})
    old_value = user["vehicle_data"].get("a_odo", 0) if user else 0
    
    # Update and log change
    users.update_one(
        {"user_id": user_id},
        {
            "$set": {"vehicle_data.a_odo": new_align_odo},
            "$push": {
                "changes_log": {
                    "timestamp": datetime.now().isoformat(),
                    "field": "last_alignment_odometer",
                    "old_value": old_value,
                    "new_value": new_align_odo,
                    "changed_by": "user_update"
                }
            }
        }
    )
    return True

def add_trip_data(user_id, trip):
    """Add trip and track change"""
    client = get_db_client()
    if not client:
        return False
    
    db = client["vehicle_bot_db"]
    users = db["users"]
    
    users.update_one(
        {"user_id": user_id},
        {
            "$push": {
                "trips_data": trip,
                "changes_log": {
                    "timestamp": datetime.now().isoformat(),
                    "field": "trip_added",
                    "trip_data": trip,
                    "changed_by": "trip_entry"
                }
            }
        }
    )
    return True

def add_report(user_id, report_data):
    """Add report to history"""
    client = get_db_client()
    if not client:
        return False
    
    db = client["vehicle_bot_db"]
    users = db["users"]
    
    users.update_one(
        {"user_id": user_id},
        {
            "$push": {
                "history_log": report_data,
                "changes_log": {
                    "timestamp": datetime.now().isoformat(),
                    "field": "report_generated",
                    "report_type": report_data.get("type", "unknown"),
                    "changed_by": "report_generation"
                }
            }
        }
    )
    return True

def get_changes_log(user_id):
    """Get all changes made to user data"""
    client = get_db_client()
    if not client:
        return []
    
    db = client["vehicle_bot_db"]
    users = db["users"]
    user = users.find_one({"user_id": user_id})
    
    return user.get("changes_log", []) if user else []

def get_all_users():
    """Get list of all users (for user switching)"""
    client = get_db_client()
    if not client:
        return []
    
    db = client["vehicle_bot_db"]
    users = db["users"]
    
    user_list = list(users.find({}, {"user_id": 1, "model": 1, "city": 1, "district": 1, "created_date": 1}))
    return user_list

# Legacy function for backward compatibility
def save_vehicle_profile(data):
    client = get_db_client()
    if client:
        db = client["vehicle_bot_db"]
        users = db["users"]
        users.update_one(
            {"user_id": "default_user"},
            {"$set": data},
            upsert=True
        )
        return True
    return False

def get_vehicle_profile():
    client = get_db_client()
    if client:
        db = client["vehicle_bot_db"]
        return db["users"].find_one({"user_id": "default_user"})
    return None