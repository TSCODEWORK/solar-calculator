"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { MapPin, Search, Zap, SunMedium, Building2, Check, RefreshCw, ChevronDown } from "lucide-react";
import { LocationData } from "@/types/solar";
import { resolveLocationClient } from "@/lib/location-lookup";

interface LocationPickerProps {
  location: LocationData | undefined;
  onLocationChange: (loc: LocationData) => void;
  onTariffChange: (rate: number) => void;
  currentTariff: number;
}

const PRESET_METROS = [
  { label: "San Francisco, CA", zip: "94102", state: "CA", rate: 0.384 },
  { label: "Los Angeles, CA", zip: "90012", state: "CA", rate: 0.338 },
  { label: "Austin, TX", zip: "78701", state: "TX", rate: 0.148 },
  { label: "Phoenix, AZ", zip: "85001", state: "AZ", rate: 0.146 },
  { label: "Boston, MA", zip: "02108", state: "MA", rate: 0.322 },
  { label: "Miami, FL", zip: "33101", state: "FL", rate: 0.155 },
  { label: "New York, NY", zip: "10001", state: "NY", rate: 0.312 },
  { label: "Denver, CO", zip: "80202", state: "CO", rate: 0.156 },
  { label: "Honolulu, HI", zip: "96813", state: "HI", rate: 0.435 },
];

const SEARCHABLE_CITIES = [
  { city: "San Francisco", state: "CA", zip: "94102", utility: "Pacific Gas & Electric (PG&E)", rate: 0.384, sun: 5.6 },
  { city: "San Jose", state: "CA", zip: "95113", utility: "Pacific Gas & Electric (PG&E)", rate: 0.384, sun: 5.6 },
  { city: "Oakland", state: "CA", zip: "94612", utility: "Pacific Gas & Electric (PG&E)", rate: 0.384, sun: 5.6 },
  { city: "Sacramento", state: "CA", zip: "95814", utility: "Pacific Gas & Electric (PG&E)", rate: 0.384, sun: 5.7 },
  { city: "Los Angeles", state: "CA", zip: "90012", utility: "Southern California Edison (SCE)", rate: 0.338, sun: 5.8 },
  { city: "San Diego", state: "CA", zip: "92101", utility: "San Diego Gas & Electric (SDG&E)", rate: 0.442, sun: 5.8 },
  { city: "Austin", state: "TX", zip: "78701", utility: "Oncor / CenterPoint (ERCOT)", rate: 0.148, sun: 5.3 },
  { city: "Dallas", state: "TX", zip: "75201", utility: "Oncor / CenterPoint (ERCOT)", rate: 0.148, sun: 5.3 },
  { city: "Houston", state: "TX", zip: "77002", utility: "Oncor / CenterPoint (ERCOT)", rate: 0.154, sun: 5.1 },
  { city: "San Antonio", state: "TX", zip: "78205", utility: "Oncor / CenterPoint (ERCOT)", rate: 0.148, sun: 5.3 },
  { city: "Phoenix", state: "AZ", zip: "85001", utility: "Arizona Public Service (APS)", rate: 0.146, sun: 6.5 },
  { city: "Scottsdale", state: "AZ", zip: "85251", utility: "Salt River Project (SRP AZ)", rate: 0.140, sun: 6.5 },
  { city: "Tucson", state: "AZ", zip: "85701", utility: "Arizona Public Service (APS)", rate: 0.146, sun: 6.5 },
  { city: "Las Vegas", state: "NV", zip: "89101", utility: "NV Energy", rate: 0.168, sun: 6.2 },
  { city: "Reno", state: "NV", zip: "89501", utility: "NV Energy", rate: 0.168, sun: 6.0 },
  { city: "Boston", state: "MA", zip: "02108", utility: "Eversource Massachusetts", rate: 0.322, sun: 4.2 },
  { city: "Miami", state: "FL", zip: "33101", utility: "Florida Power & Light (FPL)", rate: 0.155, sun: 5.4 },
  { city: "Orlando", state: "FL", zip: "32801", utility: "Duke Energy Florida", rate: 0.162, sun: 5.4 },
  { city: "Tampa", state: "FL", zip: "33602", utility: "Florida Power & Light (FPL)", rate: 0.155, sun: 5.4 },
  { city: "New York", state: "NY", zip: "10001", utility: "Consolidated Edison (ConEd NY)", rate: 0.312, sun: 4.2 },
  { city: "Brooklyn", state: "NY", zip: "11201", utility: "Consolidated Edison (ConEd NY)", rate: 0.312, sun: 4.2 },
  { city: "Denver", state: "CO", zip: "80202", utility: "Xcel Energy", rate: 0.156, sun: 5.4 },
  { city: "Boulder", state: "CO", zip: "80302", utility: "Xcel Energy", rate: 0.156, sun: 5.4 },
  { city: "Salt Lake City", state: "UT", zip: "84101", utility: "Rocky Mountain Power", rate: 0.126, sun: 5.5 },
  { city: "Seattle", state: "WA", zip: "98101", utility: "Puget Sound Energy (PSE)", rate: 0.124, sun: 3.8 },
  { city: "Portland", state: "OR", zip: "97201", utility: "Portland General Electric (PGE)", rate: 0.148, sun: 4.3 },
  { city: "Chicago", state: "IL", zip: "60601", utility: "Commonwealth Edison (ComEd)", rate: 0.168, sun: 4.3 },
  { city: "Philadelphia", state: "PA", zip: "19102", utility: "PECO Energy", rate: 0.186, sun: 4.3 },
  { city: "Atlanta", state: "GA", zip: "30303", utility: "Georgia Power", rate: 0.146, sun: 4.9 },
  { city: "Charlotte", state: "NC", zip: "28202", utility: "Duke Energy Carolinas", rate: 0.142, sun: 4.7 },
  { city: "Raleigh", state: "NC", zip: "27601", utility: "Duke Energy Carolinas", rate: 0.142, sun: 4.7 },
  { city: "Honolulu", state: "HI", zip: "96813", utility: "Hawaiian Electric (HECO)", rate: 0.435, sun: 5.8 },
  { city: "Hartford", state: "CT", zip: "06103", utility: "Eversource Connecticut", rate: 0.308, sun: 4.2 },
  { city: "Newark", state: "NJ", zip: "07102", utility: "PSE&G NJ", rate: 0.198, sun: 4.4 },
  { city: "Providence", state: "RI", zip: "02903", utility: "Rhode Island Energy", rate: 0.285, sun: 4.2 },
];

export function LocationPicker({
  location,
  onLocationChange,
  onTariffChange,
  currentTariff,
}: LocationPickerProps) {
  const [searchInput, setSearchInput] = useState(location ? `${location.city}, ${location.state} (${location.zip})` : "San Francisco, CA (94102)");
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync displayed search input when location changes externally
  useEffect(() => {
    if (location && !isFocused) {
      setSearchInput(`${location.city}, ${location.state} (${location.zip})`);
    }
  }, [location, isFocused]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!searchInput) return SEARCHABLE_CITIES.slice(0, 6);
    const q = searchInput.toLowerCase().replace(/[^a-z0-9]/g, "");
    return SEARCHABLE_CITIES.filter((item) => {
      const matchCity = item.city.toLowerCase().replace(/[^a-z0-9]/g, "").includes(q);
      const matchState = item.state.toLowerCase() === q || item.state.toLowerCase().includes(q);
      const matchZip = item.zip.startsWith(q) || item.zip.includes(q);
      const matchUtil = item.utility.toLowerCase().includes(q);
      return matchCity || matchState || matchZip || matchUtil;
    }).slice(0, 6);
  }, [searchInput]);

  const fetchLocationData = async (queryStr: string) => {
    if (!queryStr) return;
    setLoading(true);
    try {
      try {
        const res = await fetch(`/api/solar-data/?query=${encodeURIComponent(queryStr)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.location) {
            onLocationChange(data.location);
            onTariffChange(data.location.ratePerKwh);
            setSearchInput(`${data.location.city}, ${data.location.state} (${data.location.zip})`);
            return;
          }
        }
      } catch {
        // Fall back to client resolution
      }

      // Fast client-side resolution
      const loc = await resolveLocationClient(queryStr);
      onLocationChange(loc);
      onTariffChange(loc.ratePerKwh);
      setSearchInput(`${loc.city}, ${loc.state} (${loc.zip})`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsFocused(false);
    }
  };

  const handleSelectCity = (cityItem: typeof SEARCHABLE_CITIES[0]) => {
    setSearchInput(`${cityItem.city}, ${cityItem.state} (${cityItem.zip})`);
    fetchLocationData(cityItem.zip);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLocationData(searchInput);
  };

  return (
    <div className="bg-[#0C1220] border border-slate-800/90 rounded-xl p-4 sm:p-5 shadow-lg relative transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-tight font-mono">
              Step 1: Location & Utility Grid
            </h2>
            <p className="text-[11px] text-slate-400">
              Auto-populates local residential rate ($/kWh) and solar peak hours
            </p>
          </div>
        </div>

        {location && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {location.city}, {location.state}
            </span>
          </div>
        )}
      </div>

      {/* Autocomplete Search Bar */}
      <div className="relative mb-3" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onFocus={() => setIsFocused(true)}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setIsFocused(true);
              }}
              placeholder="Search ZIP code (e.g. 94103, 02138), City, or State..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono transition-colors"
            />
            {loading && (
              <RefreshCw className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-emerald-400" />
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-mono font-medium text-slate-200 border border-slate-700 rounded-lg transition-all cursor-pointer active:scale-95"
          >
            Locate
          </button>
        </form>

        {/* Dropdown Suggestions */}
        {isFocused && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#090D16] border border-slate-700 rounded-lg shadow-2xl z-40 overflow-hidden divide-y divide-slate-800/80 font-mono text-xs">
            <div className="px-3 py-1.5 bg-slate-950 text-[10px] uppercase text-slate-400 tracking-wider">
              Matching Regional Rates & Solar Stations
            </div>
            {filteredSuggestions.map((item) => (
              <button
                key={`${item.city}-${item.zip}`}
                type="button"
                onClick={() => handleSelectCity(item)}
                className="w-full px-3 py-2 text-left hover:bg-slate-800/70 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div>
                  <div className="text-slate-100 font-semibold group-hover:text-emerald-300">
                    {item.city}, {item.state} <span className="text-slate-500 font-normal">({item.zip})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                    {item.utility}
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <div className="text-emerald-400 font-bold">${item.rate.toFixed(3)}/kWh</div>
                  <div className="text-[10px] text-amber-400">{item.sun} peak hrs/day</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preset Region Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[10px] font-mono text-slate-400 uppercase mr-0.5 shrink-0">
          Popular:
        </span>
        {PRESET_METROS.map((metro) => {
          const isSelected = location?.state === metro.state && location?.zip.startsWith(metro.zip.slice(0, 3));
          return (
            <button
              key={metro.label}
              type="button"
              onClick={() => {
                setSearchInput(`${metro.label} (${metro.zip})`);
                fetchLocationData(metro.zip);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono shrink-0 transition-all border cursor-pointer ${
                isSelected
                  ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-semibold"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {metro.label} <span className="text-emerald-400/90 text-[10px]">${metro.rate.toFixed(2)}</span>
            </button>
          );
        })}
      </div>

      {/* Detected Location Detail Card */}
      {location && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5 uppercase tracking-wider">
              <Building2 className="w-3 h-3 text-slate-400" /> Utility Provider
            </div>
            <div className="text-xs font-mono font-medium text-slate-100 truncate" title={location.utility}>
              {location.utility}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5 uppercase tracking-wider">
              <Zap className="w-3 h-3 text-amber-400" /> Electricity Tariff
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400">
              ${location.ratePerKwh.toFixed(3)} <span className="text-[10px] text-slate-400 font-normal">/ kWh</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5 uppercase tracking-wider">
              <SunMedium className="w-3 h-3 text-amber-400" /> Solar Insolation
            </div>
            <div className="text-xs font-mono font-bold text-amber-300">
              {location.peakSunHours} <span className="text-[10px] text-slate-400 font-normal">peak hrs/day</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
