// GOOGLE MAPS CONFIGURATION
// You need a Google Maps API Key with "Maps JavaScript API" enabled.

function initMap() {
    // Center on North Texas (approximate)
    const northTexas = { lat: 33.2, lng: -97.1 };

    const map = new google.maps.Map(document.getElementById("service-map"), {
        zoom: 8,
        center: northTexas,
        mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
        styles: [
            // Dark Mode / "Storm" Style
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }],
            },
        ],
    });

    // 1. SERVICE AREA CIRCLE (Primary Zone)
    const serviceCircle = new google.maps.Circle({
        strokeColor: "#00d2ff", // Brand Cyan
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#00d2ff",
        fillOpacity: 0.15,
        map,
        center: northTexas, // Centered on DFW/Denton area
        radius: 80000, // 80km ~ 50 miles
    });

    // 2. RECENT STORM MARKERS (Simulated Data)
    // In a real app, you could fetch these from an endpoint
    const storms = [
        { pos: { lat: 33.2148, lng: -97.1331 }, title: "Hail Event: Denton (2 Days Ago)" },
        { pos: { lat: 33.1507, lng: -96.8236 }, title: "Wind Damage: Frisco" },
        { pos: { lat: 32.7767, lng: -96.7970 }, title: "Hail Swath: Dallas" },
        { pos: { lat: 32.7555, lng: -97.3308 }, title: "Roofing Ops: Ft Worth" },
    ];

    storms.forEach((storm) => {
        // AdvancedMarkerElement migration
        const pinElement = new google.maps.marker.PinElement({
             background: "#ff3d00",
             borderColor: "white",
             glyphColor: "white",
             scale: 1.2,
        });

        new google.maps.marker.AdvancedMarkerElement({
            position: storm.pos,
            map,
            title: storm.title,
            content: pinElement.element,
        });
    });
    // 3. ADDRESS AUTOCOMPLETE (Lead Form)
    const addressInput = document.getElementById("address");
    if (addressInput) {
        const autocomplete = new google.maps.places.Autocomplete(addressInput, {
            componentRestrictions: { country: "us" },
            fields: ["address_components", "geometry", "icon", "name"],
            types: ["address"],
        });

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) {
                // User entered name of Place that was not suggested and
                // pressed the Enter key, or the Place Details request failed.
                window.alert("No details available for input: '" + place.name + "'");
                return;
            }
            // Optional: Auto-fill zip/city if needed in future
        });
    }
}
