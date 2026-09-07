import { useState, useRef } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import logo from "@/imports/image.png";
import {
  Car,
  Wrench,
  Camera,
  BarChart2,
  History,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Activity,
  Calendar,
  Route,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  LogOut,
  Shield,
  Hash,
  User,
  ArrowLeft,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoadType = "city" | "highway" | "mountain" | "rough" | "carpeted";

interface Trip {
  id: string;
  distance: number;
  roads: RoadType[];
  date: string;
}

interface ServiceRecord {
  date: string;
  mileage: number;
}

interface UserProfile {
  vehicleNumber: string; // normalised uppercase — used as unique key
  passwordHash: string;  // simple btoa hash (demo-grade)
  vehicle: {
    type: string;
    model: string;
    district: string;
    city: string;
    year: number;
    currentOdometer: number;
  };
  lastService: ServiceRecord;
  lastAlignment: ServiceRecord;
  trips: Trip[];
  reports: Report[];
}

interface Report {
  id: string;
  timestamp: string;
  vehicleModel: string;
  analysisType: string;
  content: string;
}

type Tab = "diagnostic" | "photo" | "trips" | "history";
type Screen = "login" | "register" | "app";

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROAD_OPTIONS: { value: RoadType; label: string }[] = [
  { value: "city", label: "City Roads" },
  { value: "mountain", label: "Mountain Roads" },
  { value: "rough", label: "Rough Roads" },
  { value: "carpeted", label: "Carpeted Roads" },
];

const VEHICLE_TYPES = ["Petrol/Diesel Car", "Hybrid", "EV", "Motorbike", "Three-Wheeler"];

const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Moneragala", "Ratnapura", "Kegalle",
];

// Vehicle number formats (case-insensitive):
//   KF-4894      → 2 letters  + dash + 4 digits
//   CAB-4893     → 3 letters  + dash + 4 digits
//   38-0382      → 2 digits   + dash + 4 digits
//   2 SRI 9982   → 1 digit    + space + SRI + space + 4 digits
const VEHICLE_NUMBER_REGEX =
  /^([A-Za-z]{2,3}-\d{4}|\d{2}-\d{4}|\d\s+[Ss][Rr][Ii]\s+\d{4})$/;

function normaliseVehicleNumber(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, " ");
}

function validateVehicleNumber(v: string): string {
  const n = normaliseVehicleNumber(v);
  if (!n) return "Vehicle number is required.";
  if (!VEHICLE_NUMBER_REGEX.test(n))
    return 'Invalid format. Accepted: KF-4894 · CAB-4893 · 38-0382 · 2 SRI 9982';
  return "";
}

function validatePassword(p: string): string {
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(p)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(p)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(p)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(p)) return "Password must contain at least one special character.";
  return "";
}

function hashPassword(p: string): string {
  return btoa(encodeURIComponent(p));
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const LS_PREFIX = "autosense_user_";

function loadUser(vehicleNumber: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + normaliseVehicleNumber(vehicleNumber));
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function saveUser(profile: UserProfile) {
  localStorage.setItem(LS_PREFIX + profile.vehicleNumber, JSON.stringify(profile));
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function FieldInput({
  label,
  error,
  hint,
  ...props
}: { label: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">{label}</label>
      <input
        {...props}
        className={`bg-input-background border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-colors ${
          error ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary focus:border-primary"
        }`}
      />
      {hint && !error && <p className="text-xs text-muted-foreground/60 font-mono">{hint}</p>}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  error,
  children,
  ...props
}: { label: string; error?: string } & React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">{label}</label>
      <select
        {...props}
        className={`bg-input-background border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 transition-colors appearance-none ${
          error ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary focus:border-primary"
        }`}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-border/50">
      <Icon className="w-4 h-4 text-primary" />
      <h3
        className="text-sm font-semibold uppercase tracking-widest text-foreground"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {label}
      </h3>
    </div>
  );
}

function AuthLogo() {
  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <ImageWithFallback src={logo} alt="AutoSense logo" className="h-12 w-auto object-contain" />
      <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Sri Lanka · Pro Vehicle Engine</p>
    </div>
  );
}

// ─── Password strength meter ──────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colours = ["bg-destructive", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-green-400"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colours[score] : "bg-border"}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {checks.map((c) => (
          <p key={c.label} className={`text-xs flex items-center gap-1 font-mono ${c.ok ? "text-green-400" : "text-muted-foreground/50"}`}>
            {c.ok ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 inline-block" />}
            {c.label}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onGoRegister }: { onLogin: (p: UserProfile) => void; onGoRegister: () => void }) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ vehicleNumber?: string; password?: string; general?: string }>({});

  const submit = () => {
    const ve = validateVehicleNumber(vehicleNumber);
    const pe = validatePassword(password);
    if (ve || pe) { setErrors({ vehicleNumber: ve || undefined, password: pe || undefined }); return; }

    const profile = loadUser(vehicleNumber);
    if (!profile) { setErrors({ general: "No account found for this vehicle number. Please register." }); return; }
    if (profile.passwordHash !== hashPassword(password)) { setErrors({ general: "Incorrect password." }); return; }
    onLogin(profile);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <AuthLogo />

        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-xl shadow-black/40">
          <div className="space-y-1">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em" }}>
              Sign In
            </h2>
            <p className="text-xs text-muted-foreground">Enter your vehicle number and password to continue.</p>
          </div>

          {errors.general && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {errors.general}
            </div>
          )}

          <FieldInput
            label="Vehicle Number"
            placeholder="e.g. KF-4894 or 2 SRI 9982"
            value={vehicleNumber}
            onChange={(e) => { setVehicleNumber(e.target.value); setErrors({}); }}
            error={errors.vehicleNumber}
            hint="Accepted: KF-4894 · CAB-4893 · 38-0382 · 2 SRI 9982"
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Your password"
                className={`w-full bg-input-background border rounded-md px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-colors ${
                  errors.password ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary focus:border-primary"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.password}
              </p>
            )}
          </div>

          <button
            onClick={submit}
            className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-accent transition-colors flex items-center justify-center gap-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em", fontSize: "0.95rem" }}
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>

          <p className="text-center text-xs text-muted-foreground">
            New vehicle?{" "}
            <button onClick={onGoRegister} className="text-primary hover:text-accent transition-colors font-medium">
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Registration Screen ──────────────────────────────────────────────────────

function RegisterScreen({ onRegistered, onGoLogin }: { onRegistered: (p: UserProfile) => void; onGoLogin: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1 — credentials
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 — vehicle & service details
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [odometer, setOdometer] = useState<number | "">("");

  const [lastServiceDate, setLastServiceDate] = useState("");
  const [lastServiceMileage, setLastServiceMileage] = useState<number | "">("");
  const [lastAlignDate, setLastAlignDate] = useState("");
  const [lastAlignMileage, setLastAlignMileage] = useState<number | "">("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    const ve = validateVehicleNumber(vehicleNumber);
    if (ve) e.vehicleNumber = ve;
    const pe = validatePassword(password);
    if (pe) e.password = pe;
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!vehicleType) e.vehicleType = "Select a vehicle type.";
    if (!vehicleModel.trim()) e.vehicleModel = "Model is required.";
    if (!district) e.district = "Select a district.";
    if (!city.trim()) e.city = "City is required.";
    if (!year || Number(year) < 1980 || Number(year) > new Date().getFullYear())
      e.year = `Enter a year between 1980 and ${new Date().getFullYear()}.`;
    if (!odometer || Number(odometer) < 0) e.odometer = "Enter a valid odometer reading.";
    if (!lastServiceDate) e.lastServiceDate = "Last service date is required.";
    if (lastServiceMileage === "" || Number(lastServiceMileage) < 0) e.lastServiceMileage = "Enter service mileage.";
    if (!lastAlignDate) e.lastAlignDate = "Last alignment date is required.";
    if (lastAlignMileage === "" || Number(lastAlignMileage) < 0) e.lastAlignMileage = "Enter alignment mileage.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep1()) return;
    // Check if account already exists
    const existing = loadUser(vehicleNumber);
    if (existing) {
      setErrors({ vehicleNumber: "An account for this vehicle number already exists." });
      return;
    }
    setStep(2);
  };

  const handleRegister = () => {
    if (!validateStep2()) return;

    const profile: UserProfile = {
      vehicleNumber: normaliseVehicleNumber(vehicleNumber),
      passwordHash: hashPassword(password),
      vehicle: {
        type: vehicleType,
        model: vehicleModel.trim(),
        district,
        city: city.trim(),
        year: Number(year),
        currentOdometer: Number(odometer),
      },
      lastService: { date: lastServiceDate, mileage: Number(lastServiceMileage) },
      lastAlignment: { date: lastAlignDate, mileage: Number(lastAlignMileage) },
      trips: [
        { id: "trip-1", distance: 0, roads: [], date: "" },
        { id: "trip-2", distance: 0, roads: [], date: "" },
        { id: "trip-3", distance: 0, roads: [], date: "" },
      ],
      reports: [],
    };

    saveUser(profile);
    onRegistered(profile);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <AuthLogo />

        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em" }}>
                {step === 1 ? "Create Account" : "Vehicle Details"}
              </h2>
              <p className="text-xs text-muted-foreground">Step {step} of 2</p>
            </div>
            <div className="flex gap-1.5">
              {[1, 2].map((s) => (
                <div key={s} className={`h-1.5 w-10 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
          </div>

          {generalError && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {generalError}
            </div>
          )}

          {/* ── Step 1: Credentials ── */}
          {step === 1 && (
            <div className="space-y-4">
              <SectionHeading icon={Hash} label="Vehicle Credentials" />

              <FieldInput
                label="Vehicle Number"
                placeholder="e.g. KF-4894 or 2 SRI 9982"
                value={vehicleNumber}
                onChange={(e) => { setVehicleNumber(e.target.value); setErrors({}); }}
                error={errors.vehicleNumber}
                hint="Accepted: KF-4894 · CAB-4893 · 38-0382 · 2 SRI 9982"
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                    placeholder="Create a strong password"
                    className={`w-full bg-input-background border rounded-md px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-colors ${
                      errors.password ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary focus:border-primary"
                    }`}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.password}</p>}
              </div>

              {password.length > 0 && <PasswordStrength password={password} />}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                    placeholder="Repeat your password"
                    className={`w-full bg-input-background border rounded-md px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-colors ${
                      errors.confirmPassword ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary focus:border-primary"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.confirmPassword}</p>}
              </div>

              <button
                onClick={handleNext}
                className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-accent transition-colors flex items-center justify-center gap-2"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em", fontSize: "0.95rem" }}
              >
                Continue <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Already registered?{" "}
                <button onClick={onGoLogin} className="text-primary hover:text-accent font-medium">Sign in</button>
              </p>
            </div>
          )}

          {/* ── Step 2: Vehicle & Service ── */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionHeading icon={Car} label="Vehicle Information" />
              <div className="grid grid-cols-2 gap-3">
                <FieldSelect label="Vehicle Type" value={vehicleType} onChange={(e) => { setVehicleType(e.target.value); setErrors({}); }} error={errors.vehicleType}>
                  <option value="">Select type</option>
                  {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </FieldSelect>
                <FieldInput label="Model" placeholder="e.g. Toyota Prius" value={vehicleModel} onChange={(e) => { setVehicleModel(e.target.value); setErrors({}); }} error={errors.vehicleModel} />
                <FieldSelect label="District" value={district} onChange={(e) => { setDistrict(e.target.value); setErrors({}); }} error={errors.district}>
                  <option value="">Select district</option>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </FieldSelect>
                <FieldInput label="City" placeholder="e.g. Nugegoda" value={city} onChange={(e) => { setCity(e.target.value); setErrors({}); }} error={errors.city} />
                <FieldInput label="Year of Manufacture" type="number" placeholder="e.g. 2019" value={year} onChange={(e) => { setYear(e.target.value ? Number(e.target.value) : ""); setErrors({}); }} error={errors.year} />
                <FieldInput label="Current Odometer (km)" type="number" placeholder="e.g. 48500" value={odometer} onChange={(e) => { setOdometer(e.target.value ? Number(e.target.value) : ""); setErrors({}); }} error={errors.odometer} />
              </div>

              <SectionHeading icon={Wrench} label="Last Service Record" />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Service Date" type="date" value={lastServiceDate} onChange={(e) => { setLastServiceDate(e.target.value); setErrors({}); }} error={errors.lastServiceDate} />
                <FieldInput label="Service Mileage (km)" type="number" placeholder="e.g. 45000" value={lastServiceMileage} onChange={(e) => { setLastServiceMileage(e.target.value ? Number(e.target.value) : ""); setErrors({}); }} error={errors.lastServiceMileage} />
              </div>

              <SectionHeading icon={Activity} label="Last Alignment Record" />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Alignment Date" type="date" value={lastAlignDate} onChange={(e) => { setLastAlignDate(e.target.value); setErrors({}); }} error={errors.lastAlignDate} />
                <FieldInput label="Alignment Mileage (km)" type="number" placeholder="e.g. 42000" value={lastAlignMileage} onChange={(e) => { setLastAlignMileage(e.target.value ? Number(e.target.value) : ""); setErrors({}); }} error={errors.lastAlignMileage} />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleRegister}
                  className="flex-1 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-accent transition-colors flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em", fontSize: "0.95rem" }}
                >
                  <UserPlus className="w-4 h-4" /> Create Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App Shell (authenticated) ────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function RoadMultiSelect({ selected, onChange }: { selected: RoadType[]; onChange: (v: RoadType[]) => void }) {
  const toggle = (road: RoadType) =>
    onChange(selected.includes(road) ? selected.filter((r) => r !== road) : [...selected, road]);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">Road Types</label>
      <div className="flex flex-wrap gap-2">
        {ROAD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
              selected.includes(opt.value)
                ? "bg-primary border-primary text-white"
                : "bg-input-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TripCard({ trip, index, onChange }: { trip: Trip; index: number; onChange: (t: Trip) => void }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
          <span className="text-xs font-bold text-primary" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{index + 1}</span>
        </div>
        <h4 className="text-sm font-semibold text-foreground">Trip {index + 1}</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Distance (km)" type="number" placeholder="e.g. 85" value={trip.distance || ""} onChange={(e) => onChange({ ...trip, distance: Number(e.target.value) })} />
        <FieldInput label="Date" type="date" value={trip.date} onChange={(e) => onChange({ ...trip, date: e.target.value })} />
      </div>
      <RoadMultiSelect selected={trip.roads} onChange={(roads) => onChange({ ...trip, roads })} />
    </div>
  );
}

function MainApp({ profile: initialProfile, onLogout }: { profile: UserProfile; onLogout: () => void }) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<Tab>("diagnostic");
  const [generating, setGenerating] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Photo chat
  const [photoQuestion, setPhotoQuestion] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = (updated: UserProfile) => { setProfile(updated); saveUser(updated); };
  const updateTrips = (trips: Trip[]) => persist({ ...profile, trips });
  const updateReports = (reports: Report[]) => persist({ ...profile, reports });

  const trips = profile.trips;
  const reports = profile.reports;
  const vehicle = profile.vehicle;

  const totalKm = trips.reduce((s, t) => s + (t.distance || 0), 0);
  const avgKm = trips.filter((t) => t.distance > 0).length
    ? Math.round(totalKm / trips.filter((t) => t.distance > 0).length)
    : 0;
  const latestDate = trips.filter((t) => t.date).sort((a, b) => (a.date > b.date ? -1 : 1))[0]?.date ?? "—";

  const roadChartData = ROAD_OPTIONS.map((opt, i) => ({
    id: `road-${i}-${opt.value}`,
    name: opt.label.split(" ")[0],
    count: trips.filter((t) => t.roads.includes(opt.value)).length,
  }));

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const tripSummary = trips.map((t, i) =>
        `Trip ${i + 1} (${t.date || "no date"}): ${t.distance}km on ${t.roads.join(", ") || "unspecified"} roads`
      ).join("\n");
      const nextService = Math.max(0, 5000 - (profile.vehicle.currentOdometer % 5000));
      const kmSinceService = profile.vehicle.currentOdometer - profile.lastService.mileage;
      const kmSinceAlign = profile.vehicle.currentOdometer - profile.lastAlignment.mileage;

      const report: Report = {
        id: `report-${Date.now()}`,
        timestamp: new Date().toISOString(),
        vehicleModel: `${vehicle.year} ${vehicle.model}`,
        analysisType: "Manual Diagnostic",
        content: `🔍 VEHICLE DIAGNOSTIC REPORT — ${vehicle.year} ${vehicle.model}
Vehicle No: ${profile.vehicleNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Location: ${vehicle.city}, ${vehicle.district}
📏 Odometer: ${vehicle.currentOdometer.toLocaleString()} km
🔧 Last Service: ${profile.lastService.date} at ${profile.lastService.mileage.toLocaleString()} km (${kmSinceService.toLocaleString()} km ago)
⚖️ Last Alignment: ${profile.lastAlignment.date} at ${profile.lastAlignment.mileage.toLocaleString()} km (${kmSinceAlign.toLocaleString()} km ago)

📊 TRIP ANALYSIS
${tripSummary}
Total: ${totalKm} km | Average: ${avgKm} km/trip

⚠️ ROAD & ENVIRONMENT WARNINGS
${trips.some((t) => t.roads.includes("mountain")) ? "• Mountain road exposure — inspect brakes & suspension every 3,000 km\n" : ""}${trips.some((t) => t.roads.includes("rough")) ? "• Rough road exposure — check alignment & tyre pressure weekly\n" : ""}${trips.some((t) => t.roads.includes("city")) ? "• Heavy city driving — coolant & brake fluid inspection recommended\n" : ""}${kmSinceService > 4000 ? "• ⚠️ Service overdue — last service was " + kmSinceService.toLocaleString() + " km ago\n" : ""}${kmSinceAlign > 8000 ? "• ⚠️ Alignment overdue — last alignment was " + kmSinceAlign.toLocaleString() + " km ago\n" : ""}

🛠️ MAINTENANCE TIMELINE
• Next service: ~${nextService.toLocaleString()} km remaining
• Alignment due: ~${Math.max(0, 10000 - kmSinceAlign).toLocaleString()} km remaining
• Air filter: inspect at next service

💰 2026 LKR COST ESTIMATES (incl. VAT 18%)
• Full service: Rs. 8,500 – 14,500
• Brake pad replacement: Rs. 6,500 – 11,000
• Wheel alignment: Rs. 2,200 – 3,800
• Tyre replacement (per unit): Rs. 14,000 – 28,000

🏪 RECOMMENDED SERVICE CENTERS (${vehicle.district})
• ${vehicle.district} Auto Care Centre — Main Road
• AutoSense Certified Workshop — ${vehicle.city}
• Lanka Service Pro — District Hub`,
      };
      updateReports([report, ...reports]);
      setGenerating(false);
      setActiveTab("history");
    }, 2200);
  };

  const handlePhotoSend = () => {
    if (!photoQuestion.trim()) return;
    const q = photoQuestion.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: q }]);
    setPhotoQuestion("");
    setChatLoading(true);
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `Based on the ${photoFile ? "uploaded vehicle image" : "your description"}, I can see potential wear indicators. "${q}" suggests:\n\n• Check brake disc thickness (min: 8mm for most SL market vehicles)\n• Inspect CV joint boots for cracking\n• Estimated repair cost: Rs. 4,500 – 9,000 (2026 LKR, incl. VAT)\n\nVisit an AutoSense certified workshop in ${vehicle.district} for a full inspection.`,
        },
      ]);
      setChatLoading(false);
    }, 1800);
  };

  const exportCSV = () => {
    const rows = [["Trip", "Distance (km)", "Road Types", "Date"], ...trips.map((t, i) => [i + 1, t.distance, t.roads.join(";"), t.date])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `autosense-${profile.vehicleNumber.replace(/\s/g, "-")}-${Date.now()}.csv`;
    a.click();
  };

  const resetTrips = () =>
    updateTrips([
      { id: `trip-${Date.now()}-1`, distance: 0, roads: [], date: "" },
      { id: `trip-${Date.now()}-2`, distance: 0, roads: [], date: "" },
      { id: `trip-${Date.now()}-3`, distance: 0, roads: [], date: "" },
    ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ImageWithFallback src={logo} alt="AutoSense logo" className="h-10 w-auto object-contain" />
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase">Sri Lanka</p>
              <p className="text-xs text-muted-foreground/60 font-mono">Pro Vehicle Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border">
              <Hash className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono text-foreground">{profile.vehicleNumber}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-primary">Online</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Dashboard Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={Route} label="Active Trips" value={trips.filter((t) => t.distance > 0).length} sub="recorded this session" />
          <StatCard icon={TrendingUp} label="Total Distance" value={`${totalKm.toLocaleString()} km`} sub={`avg ${avgKm} km/trip`} />
          <StatCard
            icon={Calendar}
            label="Latest Trip"
            value={latestDate === "—" ? "—" : new Date(latestDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            sub="most recent recorded"
          />
        </section>

        {/* Tabs */}
        <div className="border-b border-border flex overflow-x-auto gap-0" style={{ scrollbarWidth: "none" }}>
          <TabButton active={activeTab === "diagnostic"} onClick={() => setActiveTab("diagnostic")} icon={Wrench} label="Manual Diagnostic" />
          <TabButton active={activeTab === "photo"} onClick={() => setActiveTab("photo")} icon={Camera} label="Photo Chat" />
          <TabButton active={activeTab === "trips"} onClick={() => setActiveTab("trips")} icon={BarChart2} label="Trip Data" />
          <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")} icon={History} label={`History (${reports.length})`} />
        </div>

        {/* ── Tab 1: Diagnostic ── */}
        {activeTab === "diagnostic" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <SectionHeading icon={Car} label="Vehicle Information" />
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Vehicle No", value: profile.vehicleNumber },
                    { label: "Type", value: vehicle.type },
                    { label: "Model", value: vehicle.model },
                    { label: "Year", value: vehicle.year },
                    { label: "District", value: vehicle.district },
                    { label: "City", value: vehicle.city },
                    { label: "Odometer", value: `${vehicle.currentOdometer.toLocaleString()} km` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
                      <span className="text-sm text-foreground font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                <FieldInput
                  label="Update Current Odometer (km)"
                  type="number"
                  value={vehicle.currentOdometer}
                  onChange={(e) => persist({ ...profile, vehicle: { ...vehicle, currentOdometer: Number(e.target.value) } })}
                />
              </div>

              <SectionHeading icon={Wrench} label="Maintenance Records" />
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Last Service Date</p>
                    <p className="text-sm text-foreground">{profile.lastService.date || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Service Mileage</p>
                    <p className="text-sm text-foreground">{profile.lastService.mileage.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Last Alignment Date</p>
                    <p className="text-sm text-foreground">{profile.lastAlignment.date || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Alignment Mileage</p>
                    <p className="text-sm text-foreground">{profile.lastAlignment.mileage.toLocaleString()} km</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <FieldInput label="Update Service Date" type="date" value={profile.lastService.date}
                    onChange={(e) => persist({ ...profile, lastService: { ...profile.lastService, date: e.target.value } })} />
                  <FieldInput label="Service Mileage" type="number" value={profile.lastService.mileage}
                    onChange={(e) => persist({ ...profile, lastService: { ...profile.lastService, mileage: Number(e.target.value) } })} />
                  <FieldInput label="Update Alignment Date" type="date" value={profile.lastAlignment.date}
                    onChange={(e) => persist({ ...profile, lastAlignment: { ...profile.lastAlignment, date: e.target.value } })} />
                  <FieldInput label="Alignment Mileage" type="number" value={profile.lastAlignment.mileage}
                    onChange={(e) => persist({ ...profile, lastAlignment: { ...profile.lastAlignment, mileage: Number(e.target.value) } })} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeading icon={Route} label="Recent Trips" />
              <div className="space-y-3">
                {trips.map((trip, i) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    index={i}
                    onChange={(t) => updateTrips(trips.map((p) => (p.id === t.id ? t : p)))}
                  />
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 rounded-lg font-semibold text-sm bg-primary text-white hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem", letterSpacing: "0.05em" }}
              >
                {generating ? (
                  <><Activity className="w-4 h-4 animate-pulse" /> Generating Report...</>
                ) : (
                  <><Wrench className="w-4 h-4" /> Generate Predictive Report</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Tab 2: Photo Chat ── */}
        {activeTab === "photo" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <SectionHeading icon={Camera} label="Upload Vehicle Photo" />
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors bg-card"
                onClick={() => fileRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Uploaded vehicle" className="max-h-56 mx-auto rounded-md object-contain" />
                ) : (
                  <div className="space-y-3">
                    <Camera className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Click to upload JPG or PNG</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPhotoFile(f);
                setPhotoPreview(URL.createObjectURL(f));
              }} />
              {photoPreview && (
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Remove photo
                </button>
              )}
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quick questions</p>
                {["What is wrong with this vehicle?", "Estimate repair cost in LKR", "Is this safe to drive?"].map((q) => (
                  <button key={q} onClick={() => setPhotoQuestion(q)} className="w-full text-left text-sm px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <SectionHeading icon={Activity} label="AI Diagnosis Chat" />
              <div className="flex-1 bg-card border border-border rounded-lg p-4 space-y-3 min-h-64 max-h-96 overflow-y-auto">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8 space-y-2">
                    <Camera className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Upload a photo and ask a question to start</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "ai" && (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Wrench className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-xs rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-white" : "bg-secondary text-secondary-foreground"}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-3.5 h-3.5 text-primary animate-spin" />
                    </div>
                    <div className="bg-secondary rounded-lg px-4 py-2 text-sm text-muted-foreground">Analysing<span className="animate-pulse"> •••</span></div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={photoQuestion}
                  onChange={(e) => setPhotoQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePhotoSend()}
                  placeholder="Ask about the vehicle..."
                  className="flex-1 bg-input-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={handlePhotoSend} disabled={!photoQuestion.trim() || chatLoading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent disabled:opacity-40 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: Trip Data ── */}
        {activeTab === "trips" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Total Distance (km)", value: totalKm },
                { label: "Average Distance (km)", value: avgKm },
                { label: "Trips Count", value: trips.filter((t) => t.distance > 0).length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card border border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em" }}>Trip Records</h3>
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs hover:bg-secondary/80 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Trip", "Distance", "Road Types", "Date"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip, i) => (
                      <tr key={trip.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold inline-flex items-center justify-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">{trip.distance > 0 ? `${trip.distance} km` : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3">
                          {trip.roads.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {trip.roads.map((r) => <span key={r} className="px-2 py-0.5 rounded bg-secondary text-xs text-secondary-foreground">{ROAD_OPTIONS.find((o) => o.value === r)?.label}</span>)}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{trip.date ? new Date(trip.date).toLocaleDateString("en-GB") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em" }}>Road Type Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={roadChartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: "#7a7a8a", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7a7a8a", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#18181c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: 12 }} labelStyle={{ color: "#f0f0f2" }} itemStyle={{ color: "#c0312b" }} />
                  <Bar dataKey="count" fill="#c0312b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <button onClick={resetTrips} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear all trip data
            </button>
          </div>
        )}

        {/* ── Tab 4: History ── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeading icon={History} label={`Diagnostic Reports (${reports.length})`} />
              {reports.length > 0 && (
                <button onClick={() => updateReports([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Clear history
                </button>
              )}
            </div>

            {reports.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center space-y-3">
                <History className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">No reports yet for {profile.vehicleNumber}</p>
                <button onClick={() => setActiveTab("diagnostic")} className="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-accent transition-colors">
                  Go to Diagnostic
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{report.vehicleModel}</p>
                          <p className="text-xs text-muted-foreground font-mono">{report.analysisType} · {new Date(report.timestamp).toLocaleString("en-GB")}</p>
                        </div>
                      </div>
                      {expandedReport === report.id ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {expandedReport === report.id && (
                      <div className="border-t border-border px-4 py-4">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {report.content}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="border-t border-border mt-auto py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-mono">AutoSense · {profile.vehicleNumber}</p>
          <p className="text-xs text-muted-foreground/50 font-mono">2026 LKR estimates incl. VAT</p>
        </div>
      </footer>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const handleLogin = (profile: UserProfile) => { setCurrentUser(profile); setScreen("app"); };
  const handleLogout = () => { setCurrentUser(null); setScreen("login"); };

  if (screen === "register") return <RegisterScreen onRegistered={handleLogin} onGoLogin={() => setScreen("login")} />;
  if (screen === "app" && currentUser) return <MainApp profile={currentUser} onLogout={handleLogout} />;
  return <LoginScreen onLogin={handleLogin} onGoRegister={() => setScreen("register")} />;
}
