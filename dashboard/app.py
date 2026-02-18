import streamlit as st
import pandas as pd
import numpy as np
import pydeck as pdk
import time
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
import plotly.express as px

# ==========================================
# 0. CONFIGURATION & SETUP
# ==========================================
st.set_page_config(
    layout="wide", 
    page_title="Hailstorm Command Center", 
    page_icon="🏙️",
    initial_sidebar_state="expanded"
)

# Custom CSS for Professional/Clean Look
st.markdown("""
    <style>
    /* Global Font & Background */
    .stApp {
        background-color: #f8f9fa; /* Light Gray Background for Clean Look */
        color: #212529;
        font-family: 'Inter', sans-serif;
    }
    
    /* Metrics Cards */
    div[data-testid="metric-container"] {
        background-color: #ffffff;
        border: 1px solid #e9ecef;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    /* Headers */
    h1, h2, h3 {
        color: #0d6efd; /* Professional Blue */
        font-weight: 600;
    }
    
    /* Sidebar */
    section[data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #dee2e6;
    }
    
    /* Buttons */
    .stButton>button {
        border-radius: 6px;
        font-weight: 500;
        background-color: #0d6efd;
        color: white;
        border: none;
    }
    .stButton>button:hover {
        background-color: #0b5ed7;
        color: white;
    }
    </style>
    """, unsafe_allow_html=True)

# Initialize Firebase
@st.cache_resource
def init_firebase():
    if not firebase_admin._apps:
        try:
            # TRY PATH 1: Local Dashboard Config
            cred = credentials.Certificate('serviceAccountKey.json')
            return firebase_admin.initialize_app(cred)
        except FileNotFoundError:
            try:
                # TRY PATH 2: Project Root Config
                cred = credentials.Certificate('../Project_Hailstorm/config/serviceAccountKey.json')
                return firebase_admin.initialize_app(cred)
            except FileNotFoundError:
                # TRY PATH 3: Application Default Credentials (CLI / Cloud Shell)
                # This allows 'gcloud auth application-default login' to work
                print("⚠️ JSON Key not found. Using Application Default Credentials...")
                cred = credentials.ApplicationDefault()
                return firebase_admin.initialize_app(cred, {
                    'projectId': 'solid-binder-487301-q0',
                })
    return firebase_admin.get_app()

app = init_firebase()

if not app:
    st.error("⚠️ **Authentication Error**: `serviceAccountKey.json` not found.")
    st.info("Please download your service account key from the Firebase Console and place it in this folder as `serviceAccountKey.json`.")
    st.stop()

db = firestore.client()

# ==========================================
# 1. DATA FETCHING
# ==========================================
@st.cache_data(ttl=60)
def get_data():
    # 1. Leads
    leads_ref = db.collection('leads')
    leads = [d.to_dict() for d in leads_ref.stream()]
    leads_df = pd.DataFrame(leads) if leads else pd.DataFrame()
    
    # 2. Senders (Mocked if collection doesn't exist yet)
    try:
        senders = [d.to_dict() for d in db.collection('sender_accounts').stream()]
    except:
        senders = []
    
    return leads_df, senders

leads_df, senders = get_data()

# ==========================================
# 2. SIDEBAR NAVIGATION
# ==========================================
with st.sidebar:
    st.title("🏙️ HAILSTORM")
    st.caption("Command Center v1.0")
    st.markdown("---")
    
    menu = st.radio("Navigation", ["Dashboard", "Lead Database", "System Health", "Settings"])
    
    st.markdown("---")
    st.info(f"**Status**: Connected 🟢\n\n**Time**: {datetime.now().strftime('%H:%M')}")

# ==========================================
# 3. DASHBOARD PAGE
# ==========================================
if menu == "Dashboard":
    # Header
    c1, c2 = st.columns([3, 1])
    with c1:
        st.title("Operations Overview")
    with c2:
        if st.button("🔄 Refresh Data"):
            st.cache_data.clear()
            st.rerun()
            
    # Key Metrics
    m1, m2, m3, m4 = st.columns(4)
    
    total_leads = len(leads_df) if not leads_df.empty else 0
    pending_leads = len(leads_df[leads_df['status'] == 'PENDING']) if not leads_df.empty and 'status' in leads_df else 0
    active_reps = len([s for s in senders if s.get('status') == 'Active'])
    revenue_est = total_leads * 150 # Mock Value per lead
    
    m1.metric("Total Leads", total_leads, "+2 today")
    m2.metric("Pending Action", pending_leads, "Urgent", delta_color="inverse")
    m3.metric("Active Reps", active_reps, "Online")
    m4.metric("Est. Pipeline", f"${revenue_est:,}", "Raw Value")
    
    # CHARTS & MAPS
    col_main, col_side = st.columns([2, 1])
    
    with col_main:
        st.subheader("Geospacial Distribution")
        if not leads_df.empty and 'lat' in leads_df.columns:
            # Map Visualization
            st.map(leads_df, zoom=4) # Simple Streamlit Map for Speed
        else:
            st.warning("No geospatial data available. Leads need 'lat' and 'lng' fields.")
            
    with col_side:
        st.subheader("Lead Sources")
        if not leads_df.empty and 'damageType' in leads_df.columns:
            source_counts = leads_df['damageType'].value_counts()
            fig = px.pie(values=source_counts.values, names=source_counts.index, hole=0.4)
            fig.update_layout(showlegend=False, margin=dict(t=0, b=0, l=0, r=0), height=300)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Insufficient data for source breakdown.")

# ==========================================
# 4. DATA TABLES
# ==========================================
elif menu == "Lead Database":
    st.title("Lead Database")
    
    if not leads_df.empty:
        # Search & Filter
        search = st.text_input("🔍 Search Leads", placeholder="Name, Address, or Phone...")
        
        if search:
            mask = leads_df.astype(str).apply(lambda x: x.str.contains(search, case=False)).any(axis=1)
            display_df = leads_df[mask]
        else:
            display_df = leads_df
            
        st.dataframe(
            display_df, 
            use_container_width=True,
            column_config={
                "created_at": st.column_config.DatetimeColumn("Date", format="D MMM, HH:mm"),
                "status": st.column_config.SelectboxColumn("Status", options=["PENDING", "CONTACTED", "SOLD", "CLOSED"]),
            }
        )
    else:
        st.info("No leads found in database.")

elif menu == "System Health":
    st.title("System Health")
    st.write("Sender monitoring coming soon.")
