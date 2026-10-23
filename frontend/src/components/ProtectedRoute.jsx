import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";
import { useLanguage } from "../i18n/LanguageContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return <Loader text={t("common.loading")} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
