import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Polls user_presence for a platform-wide online count.
 * A user is considered online if last_seen > NOW() - 90s.
 * Refreshes every 30 seconds.
 */
export function useOnlineCount() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        const threshold = new Date(Date.now() - 90_000).toISOString();
        const { count: n } = await supabase
          .from("user_presence")
          .select("*", { count: "exact", head: true })
          .gte("last_seen", threshold);
        if (mounted && typeof n === "number") setCount(n);
      } catch {
        // non-critical
      }
    };

    fetch();
    const id = setInterval(fetch, 30_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return count;
}
