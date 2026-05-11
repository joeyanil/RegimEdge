import React, { useState, useEffect, useRef } from "react";
import { 
  p2pSelect, 
  p2pInsert, 
  p2pUpdate, 
  Icon, 
  P2P_TEXT 
} from "./p2pHelpers";

const ExchangePage = ({ user, kyc, lang }) => {
  const T = P2P_TEXT[lang];
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [kycData, setKycData] = useState(null);
  const inputRef = useRef(null);
  
  const handleKycSubmit = async () => {
    try {
      setLoading(true);
      setErr("");
      
      // Validate required fields
      if (!kycData?.fullname) throw new Error(T.kyc_fullname + " " + T.required);
      if (!kycData?.phone) throw new Error(T.kyc_phone + " " + T.required);
      if (!kycData?.telegram) throw new Error(T.kyc_telegram + " " + T.required);
      if (!kycData?.idType) throw new Error(T.kyc_id_type + " " + T.required);
      if (!kycData?.idPhoto) throw new Error(T.kyc_id_photo + " " + T.required);
      if (!kycData?.selfie) throw new Error(T.kyc_selfie + " " + T.required);
      
      // Save to database
      await p2pInsert("kyc_verifications", {
        user_id: user.id,
        fullname: kycData.fullname,
        phone: kycData.phone,
        telegram: kycData.telegram,
        id_type: kycData.idType,
        status: "pending",
        created_at: new Date().toISOString()
      });
      
      // Upload documents
      if (kycData.idPhotoFile) {
        await p2pUpload(
          "kyc-docs", 
          `id/${user.id}_${Date.now()}.jpg`, 
          kycData.idPhotoFile
        );
      }
      
      if (kycData.selfieFile) {
        await p2pUpload(
          "kyc-docs", 
          `selfie/${user.id}_${Date.now()}.jpg`, 
          kycData.selfieFile
        );
      }
      
      // Update state
      setKyc(prev => ({ ...prev, status: "pending" }));
      setKycData(null);
      
      // Send notification email
      sendNotificationEmail("kyc-submitted", { 
        email: user.email, 
        name: kycData.fullname 
      });
      
    } catch (e) {
      setErr(e.message || T.error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: "32px 22px" }}>
      <SH label="Identity Verification" title={T.kyc_title} sub={T.kyc_subtitle} />
      
      {/* KYC Form */}
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            {T.kyc_fullname}
          </label>
          <input
            type="text"
            value={kycData?.fullname || ""}
            onChange={e => setKycData(prev => ({ ...prev, fullname: e.target.value }))}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd" }}
            placeholder={T.kyc_fullname}
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            {T.kyc_phone}
          </label>
          <input
            type="tel"
            value={kycData?.phone || ""}
            onChange={e => setKycData(prev => ({ ...prev, phone: e.target.value }))}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd" }}
            placeholder={T.kyc_phone}
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            {T.kyc_telegram}
          </label>
          <input
            type="text"
            value={kycData?.telegram || ""}
            onChange={e => setKycData(prev => ({ ...prev, telegram: e.target.value }))}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd" }}
            placeholder={T.kyc_telegram}
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            {T.kyc_id_type}
          </label>
          <select
            value={kycData?.idType || ""}
            onChange={e => setKycData(prev => ({ ...prev, idType: e.target.value }))}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd" }}
          >
            <option value="">{T.select}</option>
            <option value="passport">{T.passport}</option>
            <option value="national_id">{T.national_id}</option>
            <option value="driver_license">{T.driver_license}</option>
          </select>
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            {T.kyc_id_photo}
          </label>
          <div style={{ 
            border: "1px dashed #ddd", 
            borderRadius: 6, 
            padding: 20, 
            textAlign: "center",
            cursor: "pointer"
          }} onClick={() => inputRef.current.click()}>
            {kycData?.idPhoto ? (
              <img src={kycData.idPhoto} alt="ID" style={{ maxWidth: "100%", maxHeight: 200 }} />
            ) : (
              <div>
                <Icon name="camera" size={24} style={{ marginBottom: 8 }} />
                <div>{T.kyc_upload_id}</div>
              </div>
            )}
            <input
              type="file"
              ref={inputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => {
                if (e.target.files[0]) {
                  const url = URL.createObjectURL(e.target.files[0]);
                  setKycData(prev => ({ 
                    ...prev, 
                    idPhoto: url,
                    idPhotoFile: e.target.files[0]
                  }));
                }
              }}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            {T.kyc_selfie}
          </label>
          <div style={{ 
            border: "1px dashed #ddd", 
            borderRadius: 6, 
            padding: 20, 
            textAlign: "center",
            cursor: "pointer"
          }} onClick={() => inputRef.current.click()}>
            {kycData?.selfie ? (
              <img src={kycData.selfie} alt="Selfie" style={{ maxWidth: "100%", maxHeight: 200 }} />
            ) : (
              <div>
                <Icon name="camera" size={24} style={{ marginBottom: 8 }} />
                <div>{T.kyc_upload_selfie}</div>
              </div>
            )}
            <input
              type="file"
              ref={inputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => {
                if (e.target.files[0]) {
                  const url = URL.createObjectURL(e.target.files[0]);
                  setKycData(prev => ({ 
                    ...prev, 
                    selfie: url,
                    selfieFile: e.target.files[0]
                  }));
                }
              }}
            />
          </div>
        </div>
        
        {err && <div style={{ color: "red", marginBottom: 16 }}>{err}</div>}
        
        <button
          onClick={handleKycSubmit}
          disabled={loading}
          style={{ 
            width: "100%", 
            padding: "12px 0", 
            backgroundColor: "#0066ff", 
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 500
          }}
        >
          {loading ? T.loading : T.kyc_submit}
        </button>
        
        <div style={{ marginTop: 24, color: "#666", fontSize: 14 }}>
          {T.kyc_warning}
        </div>
      </div>
    </div>
  );
};

// Helper components would go here...
