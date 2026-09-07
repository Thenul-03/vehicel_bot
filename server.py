import os
import uuid
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, flash, make_response
from dotenv import load_dotenv
import logic

load_dotenv()

app = Flask(__name__, template_folder="templates")
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-me-secret")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
REPORT_STORE = {}

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

VEHICLE_TYPES = ["Petrol/Diesel Car", "Hybrid", "EV", "Motorbike", "Three-Wheeler"]
DISTRICTS = ["Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Moneragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"]
ROAD_TYPES = ["Carpeted", "City", "Mountain", "Rough"]
PARTS_OPTIONS = ["Engine Oil", "Air Filter", "Cabin Filter", "Spark Plugs", "Battery", "Brake Pads", "Brake Fluid", "Tyres", "Alignment", "Suspension", "Exhaust", "Radiator Hose", "Water Pump", "Alternator", "Starter Motor", "Transmission Fluid", "Power Steering Fluid", "Clutch Plate", "Other"]


def allowed_file(filename):
    return filename and "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def get_vehicle_context(vehicle_data):
    model = vehicle_data.get("model", "Vehicle")
    city = vehicle_data.get("city", "Location")
    return f"{model} in {city}"


def default_vehicle_data():
    return {
        "v_type": "Petrol/Diesel Car",
        "model": "",
        "m_year": 2018,
        "odo": 0,
        "district": "Colombo",
        "city": "",
        "s_odo": 0,
        "a_odo": 0,
        "tp_check": 0,
        "parts_replaced": [],
        "additional_notes": "",
        "t1_km": 0,
        "t1_date": datetime.now().date().isoformat(),
        "t1_road": [],
        "t2_km": 0,
        "t2_date": (datetime.now()).date().isoformat(),
        "t2_road": [],
        "t3_km": 0,
        "t3_date": (datetime.now()).date().isoformat(),
        "t3_road": []
    }


@app.route("/", methods=["GET", "POST"])
def index():
    active_tab = request.args.get("tab", "report")
    vehicle_data = session.get("vehicle_data", default_vehicle_data())
    report_data = None
    chat_history = session.get("chat_history", [])

    if request.method == "POST":
        form_type = request.form.get("form_type", "report")
        active_tab = request.form.get("active_tab", form_type)

        if form_type == "report":
            action = request.form.get("action", "generate")
            if action == "refresh":
                session.pop("vehicle_data", None)
                session.pop("last_report_id", None)
                session.pop("chat_history", None)
                return redirect(url_for("index", tab="report"))

            vehicle_data = {
                "v_type": request.form.get("v_type", "Petrol/Diesel Car"),
                "model": request.form.get("model", ""),
                "m_year": to_int(request.form.get("m_year", 2018), 2018),
                "odo": to_int(request.form.get("odo", 0), 0),
                "district": request.form.get("district", "Colombo"),
                "city": request.form.get("city", ""),
                "s_odo": to_int(request.form.get("service_odo", 0), 0),
                "a_odo": to_int(request.form.get("alignment_odo", 0), 0),
                "tp_check": to_int(request.form.get("tire_pressure_odo", 0), 0),
                "parts_replaced": request.form.getlist("parts_replaced"),
                "additional_notes": request.form.get("additional_notes", ""),
                "t1_km": to_int(request.form.get("t1_km", 0), 0),
                "t1_date": request.form.get("t1_date", datetime.now().date().isoformat()),
                "t1_road": request.form.getlist("t1_road"),
                "t2_km": to_int(request.form.get("t2_km", 0), 0),
                "t2_date": request.form.get("t2_date", datetime.now().date().isoformat()),
                "t2_road": request.form.getlist("t2_road"),
                "t3_km": to_int(request.form.get("t3_km", 0), 0),
                "t3_date": request.form.get("t3_date", datetime.now().date().isoformat()),
                "t3_road": request.form.getlist("t3_road")
            }
            session["vehicle_data"] = vehicle_data

            if not vehicle_data["model"]:
                flash("Please enter vehicle model.", "warning")
            elif all(vehicle_data[f"t{i}_km"] == 0 for i in range(1, 4)):
                flash("Please enter distance for at least one recent trip.", "warning")
            else:
                trips = [
                    {"km": vehicle_data["t1_km"], "road": vehicle_data["t1_road"], "date": vehicle_data["t1_date"]},
                    {"km": vehicle_data["t2_km"], "road": vehicle_data["t2_road"], "date": vehicle_data["t2_date"]},
                    {"km": vehicle_data["t3_km"], "road": vehicle_data["t3_road"], "date": vehicle_data["t3_date"]}
                ]
                report_data = logic.get_advanced_report(
                    vehicle_data["v_type"],
                    vehicle_data["model"],
                    vehicle_data["m_year"],
                    vehicle_data["odo"],
                    vehicle_data["district"],
                    vehicle_data["city"],
                    0,
                    vehicle_data["a_odo"],
                    vehicle_data["s_odo"],
                    trips,
                    vehicle_data["parts_replaced"],
                    vehicle_data["additional_notes"],
                    {},
                    None
                )
                report_id = str(uuid.uuid4())
                REPORT_STORE[report_id] = report_data
                session["last_report_id"] = report_id
                flash("Diagnostic report generated successfully.", "success")

        elif form_type == "chat":
            user_query = request.form.get("chat_query", "").strip()
            if not user_query:
                flash("Please enter a question for the AI mechanic.", "warning")
            else:
                if not chat_history:
                    chat_history = [{"role": "assistant", "content": "👋 Hello! I'm your AI Mechanic. Ask any vehicle maintenance or repair question."}]
                chat_history.append({"role": "user", "content": user_query})
                session["chat_history"] = chat_history

                image_file = request.files.get("chat_photo")
                if image_file and allowed_file(image_file.filename):
                    response = logic.analyze_vision_chat(image_file, user_query, get_vehicle_context(vehicle_data))
                else:
                    response = logic.chat_with_mechanic(user_query, get_vehicle_context(vehicle_data))

                chat_history.append({"role": "assistant", "content": response})
                session["chat_history"] = chat_history
                active_tab = "chat"

    last_report_id = session.get("last_report_id")
    if last_report_id:
        report_data = REPORT_STORE.get(last_report_id)

    return render_template(
        "index.html",
        active_tab=active_tab,
        vehicle_data=vehicle_data,
        report_data=report_data,
        chat_history=session.get("chat_history", []),
        districts=DISTRICTS,
        vehicle_types=VEHICLE_TYPES,
        road_types=ROAD_TYPES,
        parts_options=PARTS_OPTIONS
    )


@app.route("/download/<string:fmt>")
def download(fmt):
    report_id = session.get("last_report_id")
    if not report_id or report_id not in REPORT_STORE:
        flash("Generate a report before downloading.", "warning")
        return redirect(url_for("index", tab="report"))

    report_data = REPORT_STORE[report_id]
    if fmt == "csv":
        content = logic.generate_csv_report(report_data)
        response = make_response(content)
        response.headers["Content-Type"] = "text/csv; charset=utf-8"
        response.headers["Content-Disposition"] = "attachment; filename=vehicle_report.csv"
        return response
    elif fmt == "pdf":
        content = logic.generate_pdf_report(report_data)
        if content is None:
            flash("Unable to generate PDF report at this time.", "danger")
            return redirect(url_for("index", tab="report"))
        response = make_response(content)
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = "attachment; filename=vehicle_report.pdf"
        return response

    flash("Unsupported download format.", "warning")
    return redirect(url_for("index", tab="report"))


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
