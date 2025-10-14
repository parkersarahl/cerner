import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const CernerPatientDetails = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [radiology, setRadiology] = useState([]);
  const [labs, setLabs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const ehrSource = localStorage.getItem("ehrSource");
        const token = localStorage.getItem("cernerToken");

        if (!ehrSource || ehrSource !== "cerner") {
          console.warn("EHR source not set or not Cerner — redirecting...");
          navigate("/frontpage", { replace: true });
          return;
        }

        if (!token) {
          console.error("Missing Cerner token — redirecting...");
          navigate("/cerner/login", { replace: true });
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const baseUrl = process.env.REACT_APP_API_URL;

        // 1️⃣ Fetch patient demographics
        try {
          const patientRes = await axios.get(
            `${baseUrl}/cerner/patient?person_id=${patientId}`,
            { headers }
          );
          console.log("Patient Response:", patientRes.data);
          setPatient(patientRes.data);
          setDebugInfo(prev => ({ ...prev, patientSuccess: true, patientData: patientRes.data }));
        } catch (err) {
          console.error("Patient fetch error:", err.response?.data || err.message);
          setDebugInfo(prev => ({ ...prev, patientError: err.response?.data || err.message }));
        }

        // 2️⃣ Fetch radiology reports
        try {
          const radiologyRes = await axios.get(
            `${baseUrl}/cerner/diagnostic-reports/radiology?patient=${patientId}`,
            { headers }
          );
          console.log("Radiology Response:", radiologyRes.data);
          setRadiology(radiologyRes.data.entry || []);
          setDebugInfo(prev => ({ ...prev, radiologySuccess: true }));
        } catch (err) {
          console.error("Radiology fetch error:", err.response?.data || err.message);
          setDebugInfo(prev => ({ ...prev, radiologyError: err.response?.data || err.message }));
        }

        // 3️⃣ Fetch lab reports
        try {
          const labRes = await axios.get(
            `${baseUrl}/cerner/diagnostic-reports/labs?patient=${patientId}`,
            { headers }
          );
          console.log("Lab Response:", labRes.data);
          setLabs(labRes.data.entry || []);
          setDebugInfo(prev => ({ ...prev, labSuccess: true }));
        } catch (err) {
          console.error("Lab fetch error:", err.response?.data || err.message);
          setDebugInfo(prev => ({ ...prev, labError: err.response?.data || err.message }));
        }

        // 4️⃣ Fetch clinical notes
        try {
          const notesRes = await axios.get(
            `${baseUrl}/cerner/document-references/clinical?patient=${patientId}`,
            { headers }
          );
          console.log("Notes Response:", notesRes.data);
          setNotes(notesRes.data.entry || []);
          setDebugInfo(prev => ({ ...prev, notesSuccess: true }));
        } catch (err) {
          console.error("Notes fetch error:", err.response?.data || err.message);
          setDebugInfo(prev => ({ ...prev, notesError: err.response?.data || err.message }));
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching Cerner patient details:", err);
        setError("Failed to load patient data. Please try again.");
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, navigate]);

  if (loading) return <div className="p-10 text-center text-gray-600">Loading patient details...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  // Helper function to safely render patient info
  const renderPatientInfo = () => {
    if (!patient) return <p className="text-gray-500">No patient data received.</p>;

    // Handle direct resource (some FHIR servers return this way)
    if (patient.resourceType === "Patient") {
      return (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Patient Information</h2>
          <p><strong>Name:</strong> {patient.name?.[0]?.text || `${patient.name?.[0]?.given?.join(" ")} ${patient.name?.[0]?.family}` || "N/A"}</p>
          <p><strong>Gender:</strong> {patient.gender || "N/A"}</p>
          <p><strong>Birth Date:</strong> {patient.birthDate || "N/A"}</p>
          <p><strong>ID:</strong> {patient.id || "N/A"}</p>
        </div>
      );
    }

    // Handle Bundle with entry array
    if (patient.entry?.[0]?.resource) {
      const resource = patient.entry[0].resource;
      return (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Patient Information</h2>
          <p><strong>Name:</strong> {resource.name?.[0]?.text || `${resource.name?.[0]?.given?.join(" ")} ${resource.name?.[0]?.family}` || "N/A"}</p>
          <p><strong>Gender:</strong> {resource.gender || "N/A"}</p>
          <p><strong>Birth Date:</strong> {resource.birthDate || "N/A"}</p>
          <p><strong>ID:</strong> {resource.id || "N/A"}</p>
        </div>
      );
    }

    // Show raw data if structure is unexpected
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">Unexpected Patient Data Structure</h2>
        <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded">
          {JSON.stringify(patient, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Cerner Patient Details
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back
        </button>
      </div>

      {/* Debug Information */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <summary className="cursor-pointer font-semibold text-blue-800">
          Debug Information (Click to expand)
        </summary>
        <pre className="text-xs mt-2 overflow-auto max-h-60 bg-white p-2 rounded">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>

      {/* Patient Demographics */}
      {renderPatientInfo()}

      {/* Radiology Reports */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Radiology Reports</h2>
        {radiology.length > 0 ? (
          radiology.map((entry, idx) => (
            <div key={idx} className="border-b border-gray-200 pb-2 mb-2">
              <p><strong>{entry.resource?.code?.text || "Unnamed Report"}</strong></p>
              <p className="text-sm text-gray-600">Status: {entry.resource?.status}</p>
              <p className="text-sm text-gray-500">Date: {entry.resource?.effectiveDateTime || "N/A"}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No radiology reports found.</p>
        )}
      </div>

      {/* Lab Reports */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Lab Reports</h2>
        {labs.length > 0 ? (
          labs.map((entry, idx) => (
            <div key={idx} className="border-b border-gray-200 pb-2 mb-2">
              <p><strong>{entry.resource?.code?.text || "Unnamed Lab"}</strong></p>
              <p className="text-sm text-gray-600">Status: {entry.resource?.status}</p>
              <p className="text-sm text-gray-500">Date: {entry.resource?.effectiveDateTime || "N/A"}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No lab results found.</p>
        )}
      </div>

      {/* Clinical Notes */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Clinical Notes</h2>
        {notes.length > 0 ? (
          notes.map((entry, idx) => (
            <div key={idx} className="border-b border-gray-200 pb-2 mb-2">
              <p><strong>{entry.resource?.type?.text || entry.resource?.type?.[0]?.text || "Note"}</strong></p>
              <p className="text-sm text-gray-600">{entry.resource?.description || "No description"}</p>
              <p className="text-sm text-gray-500">Date: {entry.resource?.date || "N/A"}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No clinical notes found.</p>
        )}
      </div>
    </div>
  );
};

export default CernerPatientDetails;