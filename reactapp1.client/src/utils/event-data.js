import {API_BASE_URL} from "@/utils/config.js";

const LS = {
    events: "cems_events",
};

function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) }

function shift(d, days = 0, hours = 0) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    x.setHours(x.getHours() + hours);
    return x;
}

function loadEvents() {
    let data = [];
    try { data = JSON.parse(localStorage.getItem(LS.events) || "[]") } catch {}
    return data;
}

function saveEvents(list) {
    localStorage.setItem(LS.events, JSON.stringify(list));
}

function seed() {
    if (loadEvents().length) return;

    const now = new Date();
    const baseDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
    const demo = [
        { title: "Intro to React", startUtc: shift(baseDay, 1).toISOString(), endUtc: shift(baseDay, 1, 2).toISOString(), location: "Lab 2", capacity: 50, category: "Tech", description: "Bring your curiosity, we'll provide snacks.", imageUrl: "", organizerId: "seed" },
        { title: "Lo-fi Beat Jam", startUtc: shift(baseDay, 2).toISOString(), endUtc: shift(baseDay, 2, 2).toISOString(), location: "Studio", capacity: 40, category: "Creative", description: "Let's create cozy beats together.", imageUrl: "", organizerId: "seed" },
        { title: "Sunset Yoga", startUtc: shift(baseDay, 3).toISOString(), endUtc: shift(baseDay, 3, 2).toISOString(), location: "Lawn", capacity: 30, category: "Wellness", description: "Mats provided, beginners welcome.", imageUrl: "", organizerId: "seed" }
    ].map(e => ({ ...e, id: uid() }));

    saveEvents(demo);
}

export function fmt(s) { const d = new Date(s); return d.toLocaleString(); }

export function getPopularEvents() {
    // seed();
    return loadEvents().slice(0, 3);
}
export async function fetchLeastRegisteredEvents(count = 3) {
    try {
        const response = await fetch(`${API_BASE_URL}/events/least-registered?count=${count}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch least registered events: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error fetching least registered events:", error);
        return [];
    }
}
