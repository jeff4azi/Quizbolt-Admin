import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

async function authHeaders() {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetches the real list of universities from the `universities` table
 * (via GET /api/admin/universities) instead of a hardcoded array.
 * Returns [{ id, name, current_semester, ... }, ...].
 */
export function useUniversities() {
  const [universities, setUniversities] = useState([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE_URL}/api/admin/universities`, {
          headers,
        });
        if (!res.ok) throw new Error("Failed to load universities");
        const data = await res.json();
        if (!cancelled) setUniversities(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching universities:", err);
        if (!cancelled) setUniversities([]);
      } finally {
        if (!cancelled) setLoadingUniversities(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { universities, loadingUniversities };
}

/**
 * Fetches the real list of colleges for a given university id from the
 * `colleges` table (via GET /api/admin/colleges?university_id=...) instead
 * of a hardcoded map. Returns [] when no universityId is provided.
 * Returns [{ id, university_id, name, ... }, ...].
 */
export function useColleges(universityId) {
  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);

  useEffect(() => {
    if (!universityId) {
      setColleges([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingColleges(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${API_BASE_URL}/api/admin/colleges?university_id=${encodeURIComponent(universityId)}`,
          { headers },
        );
        if (!res.ok) throw new Error("Failed to load colleges");
        const data = await res.json();
        if (!cancelled) setColleges(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching colleges:", err);
        if (!cancelled) setColleges([]);
      } finally {
        if (!cancelled) setLoadingColleges(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [universityId]);

  return { colleges, loadingColleges };
}
