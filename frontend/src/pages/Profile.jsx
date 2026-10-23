import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfile, updateProfile, saveSoilTest, clearSoilTest, changePassword, exportMyData, deleteAccount,
  listDevices, createDevice, deleteDevice, searchPlaces, errorMessage,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import Loader from "../components/Loader";
import SoilTestForm from "../components/SoilTestForm";

function Section({ id, title, help, children }) {
  return (
    <section className="card profile-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {help && <p className="section-help">{help}</p>}
      {children}
    </section>
  );
}

function StatusLine({ status }) {
  if (!status) return null;
  return (
    <p className={`form-status ${status.type}`} role={status.type === "error" ? "alert" : "status"}>
      {status.text}
    </p>
  );
}

function AccountSection({ profile, onSaved }) {
  const { t } = useLanguage();
  const [name, setName] = useState(profile.name || "");
  const [status, setStatus] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    try {
      onSaved(await updateProfile({ name: name.trim() || null }));
      setStatus({ type: "success", text: t("prof.saved") });
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };

  return (
    <Section id="account" title={t("prof.account")}>
      <form onSubmit={save} className="inline-form">
        <div className="form-group">
          <label htmlFor="profile-name">{t("prof.name")}</label>
          <input id="profile-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="form-group">
          <label htmlFor="profile-email">{t("prof.email")}</label>
          <input id="profile-email" value={profile.email} readOnly />
        </div>
        <button type="submit" className="btn-primary">{t("common.save")}</button>
      </form>
      <StatusLine status={status} />
    </Section>
  );
}

function LocationSection({ profile, onSaved }) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState(null);
  const requestId = useRef(0);

  // Debounced search; ignores responses that arrive after a newer query.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchPlaces(query, language);
        if (id === requestId.current) setResults(found);
      } catch (err) {
        if (id === requestId.current) setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, language, t]);

  const choose = async (place) => {
    try {
      onSaved(await updateProfile({ location: place }));
      setQuery("");
      setResults([]);
      setStatus({ type: "success", text: t("prof.saved") });
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };

  const useBrowserLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => choose({
        name: `${t("prof.myLocation")} (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`,
        lat: Number(pos.coords.latitude.toFixed(2)),
        lon: Number(pos.coords.longitude.toFixed(2)),
      }),
      () => setStatus({ type: "error", text: t("common.error") }),
      { enableHighAccuracy: false, timeout: 15000 }
    );
  };

  return (
    <Section id="location" title={t("prof.location")} help={t("prof.locationHelp")}>
      <p className="current-value">
        {profile.location ? t("prof.locationCurrent", { place: profile.location.name }) : t("prof.locationNone")}
      </p>
      <div className="form-group">
        <label htmlFor="place-search">{t("prof.locationSearch")}</label>
        <input
          id="place-search"
          type="search"
          value={query}
          placeholder={t("prof.locationSearchPh")}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-describedby="place-results"
        />
      </div>
      <div id="place-results" aria-live="polite">
        {searching && <p className="section-help">{t("common.loading")}</p>}
        {!searching && query.trim().length >= 2 && results.length === 0 && <p className="section-help">{t("prof.noResults")}</p>}
        {results.length > 0 && (
          <ul className="place-results">
            {results.map((place) => (
              <li key={`${place.lat},${place.lon},${place.name}`}>
                <button type="button" onClick={() => choose(place)}>{place.name}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="button-row">
        <button type="button" className="btn-secondary" onClick={useBrowserLocation}>{t("field.useMyLocation")}</button>
        {profile.location && (
          <button type="button" className="btn-secondary" onClick={() => choose(null)}>{t("prof.locationClear")}</button>
        )}
      </div>
      <StatusLine status={status} />
    </Section>
  );
}

function SoilSection({ profile, onSaved }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);

  const save = async (values) => {
    try {
      onSaved(await saveSoilTest(values));
      setStatus({ type: "success", text: t("prof.saved") });
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };
  const clear = async () => {
    try {
      onSaved(await clearSoilTest());
      setStatus({ type: "success", text: t("prof.saved") });
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };

  return (
    <Section id="soil" title={t("prof.soilTitle")} help={t("prof.soilHelp")}>
      <SoilTestForm initial={profile.soilTest} onSubmit={save} onClear={profile.soilTest ? clear : null} />
      <StatusLine status={status} />
    </Section>
  );
}

function LanguageSection({ profile, onSaved }) {
  const { t, language, setLanguage } = useLanguage();
  const choose = async (next) => {
    setLanguage(next);
    try {
      onSaved(await updateProfile({ language: next }));
    } catch {
      // the local choice still applies
    }
  };
  return (
    <Section id="language" title={t("prof.language")} help={t("prof.languageHelp")}>
      <div className="segmented" role="radiogroup" aria-labelledby="language-title">
        {[["en", "English"], ["hi", "हिन्दी"]].map(([code, label]) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={(profile.language || language) === code}
            className={(profile.language || language) === code ? "active" : ""}
            onClick={() => choose(code)}
          >
            {label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function DevicesSection() {
  const { t } = useLanguage();
  const [devices, setDevices] = useState(null);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    listDevices().then(setDevices).catch(() => setDevices([]));
  }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      const { device, key } = await createDevice(name.trim());
      setDevices((prev) => [device, ...(prev || [])]);
      setNewKey(key);
      setCopied(false);
      setName("");
      setStatus(null);
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };

  const remove = async (id) => {
    try {
      await deleteDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      // clipboard blocked; the key is still selectable on screen
    }
  };

  return (
    <Section id="devices" title={t("prof.devices")} help={t("prof.devicesHelp")}>
      <form onSubmit={add} className="inline-form">
        <div className="form-group">
          <label htmlFor="device-name">{t("prof.deviceName")}</label>
          <input id="device-name" value={name} maxLength={40} required placeholder={t("prof.deviceNamePh")} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">{t("prof.addDevice")}</button>
      </form>

      {newKey && (
        <div className="key-reveal" role="status">
          <p>{t("prof.deviceKeyOnce")}</p>
          <code>{newKey}</code>
          <button type="button" className="btn-secondary" onClick={copy}>{copied ? t("prof.copied") : t("prof.copy")}</button>
        </div>
      )}

      {devices === null ? (
        <p className="section-help">{t("common.loading")}</p>
      ) : devices.length === 0 ? (
        <p className="section-help">{t("prof.noDevices")}</p>
      ) : (
        <ul className="device-list">
          {devices.map((d) => (
            <li key={d.id}>
              <div>
                <strong>{d.name}</strong>
                <span className="muted"> · {d.keyPrefix}… · {d.lastUsedAt
                  ? t("prof.lastUsed", { when: new Date(d.lastUsedAt).toLocaleString() })
                  : t("prof.neverUsed")}</span>
              </div>
              <button type="button" className="link-danger" onClick={() => remove(d.id)} aria-label={`${t("common.remove")} ${d.name}`}>
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <StatusLine status={status} />
    </Section>
  );
}

function PasswordSection({ profile, onChanged }) {
  const { t } = useLanguage();
  const isGoogle = profile.authProvider === "google";
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await changePassword(isGoogle ? undefined : current, next);
      setCurrent("");
      setNext("");
      setStatus({ type: "success", text: t("prof.passwordChanged") });
      onChanged();
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };

  return (
    <Section id="password" title={isGoogle ? t("prof.passwordSet") : t("prof.password")} help={isGoogle ? t("prof.passwordGoogleHelp") : null}>
      <form onSubmit={submit} className="inline-form">
        {/* Hidden username field so password managers file the new password correctly. */}
        <input type="email" value={profile.email} autoComplete="username" readOnly hidden />
        {!isGoogle && (
          <div className="form-group">
            <label htmlFor="current-password">{t("prof.currentPassword")}</label>
            <input id="current-password" type="password" value={current} required autoComplete="current-password" onChange={(e) => setCurrent(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="new-password">{t("prof.newPassword")}</label>
          <input id="new-password" type="password" value={next} required minLength={8} autoComplete="new-password" placeholder={t("login.passwordHint")} onChange={(e) => setNext(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">{isGoogle ? t("prof.passwordSet") : t("prof.changePassword")}</button>
      </form>
      <StatusLine status={status} />
    </Section>
  );
}

function DataSection() {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);

  const download = async () => {
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "cropmind-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };

  return (
    <Section id="data" title={t("prof.data")} help={t("prof.dataHelp")}>
      <button type="button" className="btn-secondary" onClick={download}>{t("prof.export")}</button>
      <StatusLine status={status} />
    </Section>
  );
}

function DeleteSection({ profile }) {
  const { t } = useLanguage();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const isGoogle = profile.authProvider === "google";
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await deleteAccount(confirmation);
      setUser(null);
      navigate("/", { replace: true, state: { notice: t("prof.deleted") } });
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err, t("common.error")) });
    }
  };

  return (
    <Section id="delete" title={t("prof.danger")} help={t("prof.dangerHelp")}>
      <form onSubmit={submit} className="inline-form danger-zone">
        <div className="form-group">
          <label htmlFor="delete-confirm">{isGoogle ? t("prof.confirmEmail") : t("prof.confirmPassword")}</label>
          <input
            id="delete-confirm"
            type={isGoogle ? "email" : "password"}
            value={confirmation}
            required
            autoComplete={isGoogle ? "off" : "current-password"}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-danger">{t("prof.deleteButton")}</button>
      </form>
      <StatusLine status={status} />
    </Section>
  );
}

export default function Profile() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  const load = () => getProfile().then(setProfile).catch((err) => setError(errorMessage(err, t("common.error"))));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page profile-page">
      <div className="dashboard-header animate-fade-in">
        <h1>{t("prof.title")}</h1>
        <p>{t("prof.subtitle")}</p>
      </div>

      {error && <p className="form-status error" role="alert">{error}</p>}
      {!profile && !error && <Loader text={t("common.loading")} />}

      {profile && (
        <div className="profile-grid">
          <AccountSection profile={profile} onSaved={setProfile} />
          <LocationSection profile={profile} onSaved={setProfile} />
          <SoilSection profile={profile} onSaved={setProfile} />
          <LanguageSection profile={profile} onSaved={setProfile} />
          <DevicesSection />
          <PasswordSection profile={profile} onChanged={load} />
          <DataSection />
          <DeleteSection profile={profile} />
        </div>
      )}
    </div>
  );
}
