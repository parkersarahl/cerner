import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const REACT_APP_API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const PatientDetail = () => {
  const { patientId } = useParams();
  const [radiologyReports, setRadiologyReports] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [ehrSource, setEhrSource] = useState(null); // epic or cerner

  useEffect(() => {
    const storedEhr = localStorage.getItem("ehrSource");
    if (!storedEhr) {
      setError("No EHR selected. Please choose Epic or Cerner.");
      setIsLoading(false);
      return;
    }
    setEhrSource(storedEhr);

    const fetchResources = async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Missing auth token");

        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [radiologyRes, labRes, notesRes, patientRes] = await Promise.all([
          axios.get(
            `${REACT_APP_API_URL}/${storedEhr}/diagnostic-reports/radiology?patient=${patientId}`,
            config
          ),
          axios.get(
            `${REACT_APP_API_URL}/${storedEhr}/diagnostic-reports/labs?patient=${patientId}`,
            config
          ),
          axios.get(
            `${REACT_APP_API_URL}/${storedEhr}/diagnostic-reports/clinical?patient=${patientId}`,
            config
          ),
          axios.get(`${REACT_APP_API_URL}/${storedEhr}/patient/${patientId}`, config),
        ]);

        const getResources = (bundle) => bundle?.entry?.map((e) => e.resource) || [];

        setClinicalNotes(getResources(notesRes.data));
        setRadiologyReports(getResources(radiologyRes.data));
        setLabReports(getResources(labRes.data));
        setPatient(patientRes.data);
      } catch (err) {
        setError(`Failed to load patient resources from ${storedEhr}.`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [patientId]);

  const ALLOWED_ACCEPTS = [
    "application/pdf",
    "image/jpeg",
    "application/dicom",
    "application/fhir+xml",
    "application/fhir+json",
    "application/json",
    "text/plain",
    "application/octet-stream",
    "application/xml",
    "*/*",
  ];

  const handleResourceClick = async (report) => {
    if (!report) {
      setError("No report data available for this item.");
      return;
    }

    let attachment = report.content?.[0]?.attachment || report.presentedForm?.[0];
    if (!attachment || !attachment.url) {
      setError("No report file URL available for this resource.");
      return;
    }

    let url = attachment.url;
    let contentType = attachment.contentType || "application/pdf";
    if (!ALLOWED_ACCEPTS.includes(contentType)) contentType = "application/pdf";

    const isAbsoluteUrl = url.startsWith("http://") || url.startsWith("https://");
    const finalUrl = isAbsoluteUrl ? url : `${REACT_APP_API_URL}/${ehrSource}/binary/${url}`;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(finalUrl, {
        responseType: "blob",
        headers: { Accept: contentType, Authorization: `Bearer ${token}` },
      });

      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      setError(`Failed to open report file from ${ehrSource}.`);
      console.error(err);
    }
  };

  const logResourceView = async (patientId, resourceId, resourceType, action) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${REACT_APP_API_URL}/${ehrSource}/audit/log-view`, null, {
        params: { patient_id: patientId, resource_id: resourceId, resource_type: resourceType, action },
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(`${ehrSource} audit log failed:`, err);
    }
  };

  const renderItem = (item, type) => {
    if (!item?.id) return null;
    const label = item.type?.text || item.type?.coding?.[0]?.display || item.title || `${type} resource`;
    const formattedDate = item.date || item.issued ? new Date(item.date || item.issued).toLocaleDateString() : "";

    return (
      <li key={`${type}-${item.id}`} className="my-1">
        <button
          onClick={() => {
            handleResourceClick(item);
            logResourceView(patientId, item.id, type, "viewed resource");
          }}
          className="text-blue-600 hover:underline focus:outline-none"
        >
          {label} ({formattedDate})
        </button>
      </li>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        <p className="text-gray-600 text-lg ml-3">Loading patient data...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">{ehrSource?.toUpperCase()} Patient Details</h2>
      {patient && (
        <div className="mb-4">
          <p className="text-lg">
            <strong>Name:</strong> {patient.name?.[0]?.given?.join(" ")} {patient.name?.[0]?.family}
          </p>
          <p className="text-lg">
            <strong>Date of Birth:</strong> {new Date(patient.birthDate).toLocaleDateString("en-US")}
          </p>
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}

      <section className="mb-6">
        <h3 className="text-lg font-medium">Radiology Reports</h3>
        <ul className="list-disc ml-6">{radiologyReports.map((r) => renderItem(r, "RadiologyReport"))}</ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-medium">Lab Reports</h3>
        <ul className="list-disc ml-6">{labReports.map((r) => renderItem(r, "LabReport"))}</ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-medium">Clinical Notes</h3>
        <ul className="list-disc ml-6">{clinicalNotes.map((r) => renderItem(r, "ClinicalNote"))}</ul>
      </section>
    </div>
  );
};

export default PatientDetail;
