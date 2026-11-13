import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Signs out and returns to the home page (even if the request fails). */
export function useSignOut(): () => Promise<void> {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  }, [logout, navigate]);
}
