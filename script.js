const API_URL = "https://travel-ai-yl2y.onrender.com/api/trips/search";

const form = document.getElementById("searchForm");
const demoButton = document.getElementById("demoButton");
const searchButton = document.getElementById("searchButton");
const statusBox = document.getElementById("statusBox");
const results = document.getElementById("results");
const resultsHeader = document.getElementById("resultsHeader");
const resultsTitle = document.getElementById("resultsTitle");
const summaryText = document.getElementById("summaryText");

const demoResponse = {
    status: "SUCCESS",
    found_valid_solution: true,
    ai_summary: "Ho trovato almeno una soluzione compatibile con il budget. Le opzioni sono ordinate dalla più economica.",
    itineraries: [
        {
            cities: ["FCO", "PMI", "AMS", "FCO"],
            flights: [
                {
                    origin: "FCO",
                    destination: "PMI",
                    departure_date: "2026-08-22",
                    price: 20,
                    airline: "Wizz Air",
                    duration_minutes: 105,
                    departure_time: "2026-08-22 06:30",
                    arrival_time: "2026-08-22 08:15"
                },
                {
                    origin: "PMI",
                    destination: "AMS",
                    departure_date: "2026-08-25",
                    price: 64,
                    airline: "easyJet",
                    duration_minutes: 165,
                    departure_time: "2026-08-25 14:10",
                    arrival_time: "2026-08-25 16:55"
                },
                {
                    origin: "AMS",
                    destination: "FCO",
                    departure_date: "2026-08-31",
                    price: 190,
                    airline: "ITA",
                    duration_minutes: 135,
                    departure_time: "2026-08-31 18:20",
                    arrival_time: "2026-08-31 20:35"
                }
            ]
        }
    ]
};

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const request = buildRequestFromForm();

    setLoading(true);
    showStatus("Sto cercando gli itinerari...");
    clearResults();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`Errore backend: ${response.status}`);
        }

        const data = await response.json();
        renderData(data, Number(request.budget));
        hideStatus();
    } catch (error) {
        showStatus(
            "Non riesco a contattare il backend. Controlla che FastAPI sia acceso, che l'endpoint sia corretto e che il CORS sia configurato.",
            true
        );
        console.error(error);
    } finally {
        setLoading(false);
    }
});

demoButton.addEventListener("click", () => {
    clearResults();
    hideStatus();
    renderData(demoResponse, Number(document.getElementById("budget").value));
});

function buildRequestFromForm() {
    const origin = document.getElementById("origin").value.trim().toUpperCase();

    const cities = document.getElementById("cities").value
        .split(",")
        .map(city => city.trim().toUpperCase())
        .filter(Boolean);

    const finalDestination = cities.length > 0
        ? cities[cities.length - 1]
        : origin;

    const intermediateCities = cities.slice(0, -1);

    return {
        origin: origin,
        final_destination: finalDestination,
        start_date: document.getElementById("startDate").value,
        end_date: document.getElementById("endDate").value,
        budget: Number(document.getElementById("budget").value),
        candidate_cities: intermediateCities
    };
}

function renderData(data, budget) {
    const itineraries = Array.isArray(data.itineraries) ? data.itineraries : [];

    resultsHeader.hidden = false;
    resultsTitle.textContent = itineraries.length === 1
        ? "1 itinerario trovato"
        : `${itineraries.length} itinerari trovati`;

    summaryText.textContent = data.ai_summary || "Risultati ordinati dal più economico.";

    if (itineraries.length === 0) {
        results.innerHTML = `<div class="empty">Nessun itinerario trovato.</div>`;
        return;
    }

    const sortedItineraries = [...itineraries].sort((a, b) => getTotalPrice(a) - getTotalPrice(b));

    results.innerHTML = sortedItineraries
        .map((itinerary, index) => renderItineraryCard(itinerary, index, budget))
        .join("");
}

function renderItineraryCard(itinerary, index, budget) {
    const totalPrice = getTotalPrice(itinerary);
    const difference = budget - totalPrice;

    const budgetLabel = difference >= 0
        ? `Risparmio ${formatPrice(difference)}`
        : `Eccesso ${formatPrice(Math.abs(difference))}`;

    const budgetClass = difference >= 0 ? "badge" : "badge badge-danger";

    const route = Array.isArray(itinerary.cities) ? itinerary.cities.join(" → ") : "Rotta non disponibile";
    const flights = Array.isArray(itinerary.flights) ? itinerary.flights : [];

    return `
        <article class="card">
            <div class="card-top">
                <div>
                    <p class="eyebrow">Soluzione #${index + 1}</p>
                    <div class="price">${formatPrice(totalPrice)}</div>
                </div>
                <span class="${budgetClass}">${budgetLabel}</span>
            </div>

            <p class="route">${escapeHtml(route)}</p>

            <div class="flights">
                ${flights.map(renderFlight).join("")}
            </div>
        </article>
    `;
}

function renderFlight(flight) {
    const route = `${flight.origin || "?"} → ${flight.destination || "?"}`;
    const airline = flight.airline || "Compagnia non disponibile";

    const timeInfo = flight.departure_time && flight.arrival_time
        ? ` · ${formatTime(flight.departure_time)} → ${formatTime(flight.arrival_time)}`
        : "";

    const duration = flight.duration_minutes ? ` · ${formatDuration(flight.duration_minutes)}` : "";

    return `
        <div class="flight">
            <div class="flight-date">${formatDate(flight.departure_date)}</div>
            <div>
                <div class="flight-route">${escapeHtml(route)}</div>
                <div class="flight-meta">${escapeHtml(airline)}${timeInfo}${duration}</div>
            </div>
            <div class="flight-price">${formatPrice(Number(flight.price || 0))}</div>
        </div>
    `;
}

function getTotalPrice(itinerary) {
    if (!Array.isArray(itinerary.flights)) return 0;
    return itinerary.flights.reduce((sum, flight) => sum + Number(flight.price || 0), 0);
}

function formatPrice(value) {
    return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0
    }).format(value);
}

function formatDate(value) {
    if (!value) return "Data ?";
    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(value));
}

function formatTime(value) {
    if (!value) return "";

    const text = String(value);

    if (text.includes(" ")) {
        return text.split(" ").pop();
    }

    return text;
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
}

function showStatus(message, isError = false) {
    statusBox.hidden = false;
    statusBox.textContent = message;
    statusBox.classList.toggle("error", isError);
}

function hideStatus() {
    statusBox.hidden = true;
    statusBox.textContent = "";
    statusBox.classList.remove("error");
}

function clearResults() {
    results.innerHTML = "";
    resultsHeader.hidden = true;
}

function setLoading(isLoading) {
    searchButton.disabled = isLoading;
    searchButton.textContent = isLoading ? "Ricerca in corso..." : "Cerca itinerari";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}