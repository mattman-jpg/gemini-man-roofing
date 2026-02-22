let map;
let drawingManager;
let currentPolygon = null;

// Estimate Multipliers
const PITCH_MULTIPLIER = 1.15; // Account for roof slope since satellite is flat
const COST_PER_SQUARE_LOW = 350; // $350/sq for basic architectural
const COST_PER_SQUARE_HIGH = 450; // $450/sq for premium/complex

function initEstimatorMap() {
    // Default center (Dallas/Plano area)
    const defaultLocation = { lat: 33.0198, lng: -96.6989 };

    map = new google.maps.Map(document.getElementById("estimator-map"), {
        center: defaultLocation,
        zoom: 18, // Very close
        mapTypeId: "satellite", // Force satellite view
        disableDefaultUI: false,
        tilt: 0 // Keep it top-down for accurate measurement
    });

    // Setup Address Autocomplete
    const input = document.getElementById("address-search");
    const autocomplete = new google.maps.places.Autocomplete(input, {
        fields: ["geometry", "name"],
        types: ["address"],
        componentRestrictions: { country: "us" }
    });

    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        // Jump to the searched address
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(20);
        }

        // Clear previous drawing if exists
        clearMap();
    });

    // Setup Drawing Manager
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [google.maps.drawing.OverlayType.POLYGON],
        },
        polygonOptions: {
            fillColor: "#00d2ff",
            fillOpacity: 0.35,
            strokeWeight: 3,
            strokeColor: "#00d2ff",
            clickable: false,
            editable: true,
            zIndex: 1,
        },
    });

    drawingManager.setMap(map);

    // Event Listener for when they finish drawing a roof
    google.maps.event.addListener(drawingManager, "polygoncomplete", function (polygon) {
        // Only allow one polygon at a time
        if (currentPolygon) {
            currentPolygon.setMap(null);
        }
        currentPolygon = polygon;

        // Switch out of drawing mode after completion
        drawingManager.setDrawingMode(null);

        calculateArea(polygon);

        // Listen for edits to the shape
        polygon.getPaths().forEach(function (path, index) {
            google.maps.event.addListener(path, 'insert_at', function () { calculateArea(polygon); });
            google.maps.event.addListener(path, 'remove_at', function () { calculateArea(polygon); });
            google.maps.event.addListener(path, 'set_at', function () { calculateArea(polygon); });
        });
    });

    // Clear map button
    document.getElementById("clear-map").addEventListener("click", clearMap);
}

function calculateArea(polygon) {
    // 1. Calculate base area in Square Meters using spherical geometry
    const areaSqMeters = google.maps.geometry.spherical.computeArea(polygon.getPath());

    // 2. Convert to Square Feet (1 sq meter = ~10.7639 sq ft)
    const flatAreaSqFt = areaSqMeters * 10.7639;

    // 3. Compensate for roof pitch
    const actualRoofSqFt = flatAreaSqFt * PITCH_MULTIPLIER;

    // 4. Calculate Roofing Squares (1 square = 100 sq ft)
    const roofingSquares = (actualRoofSqFt / 100);

    // 5. Update UI
    document.getElementById('sqft-display').innerText = Math.round(actualRoofSqFt).toLocaleString();
    document.getElementById('squares-display').innerText = roofingSquares.toFixed(1);

    // 6. Calculate Price Range
    const lowCost = Math.round(roofingSquares * COST_PER_SQUARE_LOW);
    const highCost = Math.round(roofingSquares * COST_PER_SQUARE_HIGH);

    // Update the locked text (hidden behind CSS blur)
    const costText = `$${lowCost.toLocaleString()} - $${highCost.toLocaleString()}`;
    document.querySelector('#locked-results .big-number').innerText = costText;
}

function clearMap() {
    if (currentPolygon) {
        currentPolygon.setMap(null);
        currentPolygon = null;
    }
    document.getElementById('sqft-display').innerText = "0";
    document.getElementById('squares-display').innerText = "0";
    document.querySelector('#locked-results .big-number').innerText = "$12,500 - $15,200"; // Reset to default placeholder
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
}

// Handle the lead capture unlock
document.getElementById('estimator-lead-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('est-name').value;
    const phone = document.getElementById('est-phone').value;
    const squares = document.getElementById('squares-display').innerText;

    // In production, send this immediately to the Chatbot Python backend or a webhook
    console.log(`NEW LEAD: ${name} / ${phone} just measured a ${squares} SQ roof.`);

    // Unlock the UI
    document.getElementById('unlock-form').style.display = 'none';
    document.getElementById('locked-results').classList.remove('blur-overlay');

    // Create an artificial celebration effect
    document.getElementById('locked-results').style.transform = 'scale(1.05)';
    document.getElementById('locked-results').style.transition = 'all 0.3s ease';
    setTimeout(() => {
        document.getElementById('locked-results').style.transform = 'scale(1)';
    }, 300);
});
