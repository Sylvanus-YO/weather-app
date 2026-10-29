// 1. WMO WEATHER CODES MAP (Translates API numeric codes into icons & labels)
const weatherCodes = {
    0: { label: "Clear Sky", dayIcon: "☀️", nightIcon: "🌙" },
    1: { label: "Mainly Clear", dayIcon: "🌤️", nightIcon: "🌙" },
    2: { label: "Partly Cloudy", dayIcon: "⛅", nightIcon: "☁️" },
    3: { label: "Overcast", dayIcon: "☁️", nightIcon: "☁️" },
    45: { label: "Foggy", dayIcon: "🌫️", nightIcon: "🌫️" },
    48: { label: "Rime Fog", dayIcon: "🌫️", nightIcon: "🌫️" },
    51: { label: "Light Drizzle", dayIcon: "🌦️", nightIcon: "🌧️" },
    53: { label: "Moderate Drizzle", dayIcon: "🌦️", nightIcon: "🌧️" },
    55: { label: "Dense Drizzle", dayIcon: "🌧️", nightIcon: "🌧️" },
    61: { label: "Slight Rain", dayIcon: "🌦️", nightIcon: "🌧️" },
    63: { label: "Moderate Rain", dayIcon: "🌧️", nightIcon: "🌧️" },
    65: { label: "Heavy Rain", dayIcon: "⛈️", nightIcon: "⛈️" },
    71: { label: "Slight Snow", dayIcon: "🌨️", nightIcon: "🌨️" },
    73: { label: "Moderate Snow", dayIcon: "❄️", nightIcon: "❄️" },
    75: { label: "Heavy Snow", dayIcon: "❄️", nightIcon: "❄️" },
    80: { label: "Rain Showers", dayIcon: "🌦️", nightIcon: "🌧️" },
    81: { label: "Heavy Showers", dayIcon: "🌧️", nightIcon: "🌧️" },
    82: { label: "Violent Showers", dayIcon: "⛈️", nightIcon: "⛈️" },
    95: { label: "Thunderstorm", dayIcon: "⛈️", nightIcon: "⛈️" },
    96: { label: "Thunderstorm & Hail", dayIcon: "⛈️", nightIcon: "⛈️" },
    99: { label: "Severe Thunderstorm", dayIcon: "🌩️", nightIcon: "🌩️" }
};

// 2. APPLICATION STATE
let appState = {
    lat: 12.0022,         // Default: Kano
    lon: 8.5920,
    locationLabel: "Kano, Nigeria",
    unit: "celsius"       // "celsius" or "fahrenheit"
};

// 3. DOM ELEMENTS
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const geoButton = document.getElementById("geoButton");
const unitToggle = document.getElementById("unitToggle");
const statusBanner = document.getElementById("statusBanner");

const dayNightBadge = document.getElementById("dayNightBadge");
const locationName = document.getElementById("locationName");
const currentDate = document.getElementById("currentDate");
const currentIcon = document.getElementById("currentIcon");
const currentTemp = document.getElementById("currentTemp");
const conditionText = document.getElementById("conditionText");
const feelsLike = document.getElementById("feelsLike");

const humidityVal = document.getElementById("humidityVal");
const windVal = document.getElementById("windVal");
const pressureVal = document.getElementById("pressureVal");
const precipVal = document.getElementById("precipVal");
const forecastList = document.getElementById("forecastList");

const apiEndpointDisplay = document.getElementById("apiEndpointDisplay");
const toggleJsonBtn = document.getElementById("toggleJsonBtn");
const jsonOutput = document.getElementById("jsonOutput");

// 4. HELPER: STATUS MESSAGES
function showStatus(message, isError = false) {
    statusBanner.textContent = message;
    statusBanner.classList.remove("hidden", "error");
    if (isError) statusBanner.classList.add("error");
}

function hideStatus() {
    statusBanner.classList.add("hidden");
}

// 5. STEP 1 API: GEOCODING (Convert City Name -> Coordinates via JSON)
async function searchCity(cityQuery) {
    try {
        showStatus(`Searching coordinates for "${cityQuery}"...`);

        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
        const response = await fetch(geoUrl);

        if (!response.ok) throw new Error("Network error while reaching Geocoding API.");

        // Parse incoming JSON text into a JS Object
        const geoData = await response.json();

        if (!geoData.results || geoData.results.length === 0) {
            showStatus(`Could not find "${cityQuery}". Check the spelling and try again.`, true);
            return;
        }

        const place = geoData.results[0];
        appState.lat = place.latitude;
        appState.lon = place.longitude;
        appState.locationLabel = `${place.name}${place.admin1 ? `, ${place.admin1}` : ""}, ${place.country}`;

        await fetchWeatherData();
    } catch (error) {
        showStatus(error.message, true);
    }
}

// 6. STEP 2 API: WEATHER FORECAST (Fetch Live Weather JSON)
async function fetchWeatherData() {
    try {
        showStatus("Fetching live weather JSON from Open-Meteo...");

        const params = new URLSearchParams({
            latitude: appState.lat,
            longitude: appState.lon,
            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "weather_code",
                "surface_pressure",
                "wind_speed_10m"
            ].join(","),
            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min"
            ].join(","),
            temperature_unit: appState.unit,
            timezone: "auto"
        });

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        const response = await fetch(weatherUrl);

        if (!response.ok) throw new Error("Failed to fetch weather telemetry.");

        // Deserialize JSON payload
        const weatherJson = await response.json();

        // Update Raw JSON Inspector so you can see exact API data structure
        apiEndpointDisplay.textContent = `GET ${weatherUrl}`;
        jsonOutput.textContent = JSON.stringify(weatherJson, null, 2);

        renderWeatherUI(weatherJson);
        hideStatus();
    } catch (error) {
        showStatus(error.message, true);
    }
}

// 7. RENDER JSON DATA TO THE DOM
function renderWeatherUI(data) {
    const current = data.current;
    const units = data.current_units;
    const daily = data.daily;

    const isDay = current.is_day === 1;
    document.body.classList.toggle("night-theme", !isDay);

    const weatherInfo = weatherCodes[current.weather_code] || {
        label: "Unknown",
        dayIcon: "🌡️",
        nightIcon: "🌡️"
    };

    // Hero Section
    dayNightBadge.textContent = isDay ? "☀️ DAYTIME TELEMETRY" : "🌙 NIGHTTIME TELEMETRY";
    locationName.textContent = appState.locationLabel;

    const now = new Date();
    currentDate.textContent = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    currentIcon.textContent = isDay ? weatherInfo.dayIcon : weatherInfo.nightIcon;
    currentTemp.textContent = `${Math.round(current.temperature_2m)}${units.temperature_2m}`;
    conditionText.textContent = weatherInfo.label;
    feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}${units.apparent_temperature}`;

    // Telemetry Cards
    humidityVal.textContent = `${current.relative_humidity_2m}${units.relative_humidity_2m}`;
    windVal.textContent = `${current.wind_speed_10m} ${units.wind_speed_10m}`;
    pressureVal.textContent = `${Math.round(current.surface_pressure)} ${units.surface_pressure}`;
    precipVal.textContent = `${current.precipitation} ${units.precipitation}`;

    // 7-Day Forecast List
    forecastList.innerHTML = "";
    daily.time.forEach((dateStr, index) => {
        const dateObj = new Date(`${dateStr}T00:00:00`);
        const dayLabel = index === 0
            ? "Today"
            : dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

        const dayCode = daily.weather_code[index];
        const dayInfo = weatherCodes[dayCode] || { dayIcon: "⛅" };
        const maxTemp = Math.round(daily.temperature_2m_max[index]);
        const minTemp = Math.round(daily.temperature_2m_min[index]);

        const row = document.createElement("div");
        row.className = "forecast-item";
        row.innerHTML = `
            <span class="forecast-day">${dayLabel}</span>
            <span class="forecast-icon" title="${dayInfo.label || ''}">${dayInfo.dayIcon}</span>
            <div class="forecast-temps">
                ${maxTemp}° <span>${minTemp}°</span>
            </div>
        `;
        forecastList.appendChild(row);
    });
}

// 8. EVENT LISTENERS

// City Search Submit
searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = cityInput.value.trim();
    if (query) {
        searchCity(query);
        cityInput.value = "";
    }
});

// Browser GPS Geolocation
geoButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
        showStatus("Geolocation is not supported by your browser.", true);
        return;
    }

    showStatus("Detecting your GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            appState.lat = position.coords.latitude.toFixed(4);
            appState.lon = position.coords.longitude.toFixed(4);
            appState.locationLabel = `My Location (${appState.lat}, ${appState.lon})`;
            await fetchWeatherData();
        },
        () => {
            showStatus("Location access denied. Search for a city manually instead.", true);
        }
    );
});

// Unit Switcher (°C / °F)
unitToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const selectedUnit = btn.dataset.unit;
    if (selectedUnit === appState.unit) return;

    appState.unit = selectedUnit;
    unitToggle.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    fetchWeatherData();
});

// Toggle Raw JSON Drawer
toggleJsonBtn.addEventListener("click", () => {
    const isHidden = jsonOutput.classList.toggle("hidden");
    toggleJsonBtn.textContent = isHidden ? "Show Raw JSON" : "Hide Raw JSON";
});

// Initial Boot
fetchWeatherData();