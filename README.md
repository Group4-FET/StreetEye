# Traffic Insight Application

Traffic Insight is a web application designed to provide real-time traffic monitoring, incident reporting, and road safety education, aiming to contribute to safer and more efficient road navigation.

## Table of Contents

* [Features](#features)
* [Technologies Used](#technologies-used)
* [Getting Started](#getting-started)
    * [Prerequisites](#prerequisites)
    * [Installation](#installation)
    * [Firebase Setup](#firebase-setup)
* [Usage](#usage)
* [Project Structure](#project-structure)
* [Contributing](#contributing)

## Features

* **User Authentication:** Secure sign-up and sign-in via email/password and Google accounts.
* **Live Traffic Monitoring Map:**
    * Displays real-time traffic incidents fetched from Firebase Firestore.
    * Interactive map, likely powered by **Leaflet & React-Leaflet** for base map tiles and custom markers (as seen in `Map.jsx`).
    * Location search functionality using **OpenStreetMap Nominatim API** (for the main map search) and **Mapbox Geocoding API** (for incident reporting).
    * Route calculation with traffic awareness using **Mapbox Directions API**.
    * Navigation controls, scale, and fullscreen mode for enhanced usability.
* **Incident Reporting:**
    * A dedicated form for users to report new incidents (Accidents, Construction, Hazards, Traffic Jams, Events, Other).
    * Location selection via search input for precise geographical coordinates.
    * Automatically assigns the authenticated user's ID as the reporter.
    * Redirects to the live map upon successful reporting.
* **Road Safety Education:** A dedicated page to provide users with valuable information and tips on road safety.
* **Centralized Firebase Management:** Efficient and consistent handling of Firebase services (Firestore and Authentication) across the application.
* **Responsive Design:** Optimized for seamless viewing and interaction across various devices (mobile, tablet, desktop).

## Technologies Used

* **Frontend:**
    * **React.js:** A JavaScript library for building user interfaces.
    * **React Router DOM:** For handling client-side routing.
    * **Tailwind CSS:** A utility-first CSS framework for rapid styling.
    * **Lucide React:** A set of beautiful and customizable open-source icons.
    * **date-fns:** For date formatting and manipulation.
* **Mapping & Geocoding:**
    * **Leaflet & React-Leaflet:** A lightweight, open-source mapping library and its React wrapper, used for the main interactive map.
    * **Mapbox Directions API:** For robust route calculation and traffic inference.
    * **Mapbox Geocoding API:** Used for geocoding (address search) in the incident reporting page.
    * **OpenStreetMap Nominatim API:** Used for geocoding (address search) on the main map page.
* **Backend & Database:**
    * **Firebase Authentication:** For user authentication (email/password, Google Sign-In).
    * **Firebase Firestore:** A NoSQL cloud database for real-time data storage (traffic incidents).

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* Node.js (LTS version recommended)
* npm or yarn
* A Firebase Project
* A Mapbox Account (for Mapbox Directions and Geocoding APIs)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd STREETEYE
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Configure Environment Variables:**
    Create a `.env` file in the root of your project. **It's crucial to store sensitive keys like your Mapbox Access Token and Firebase keys in environment variables and never hardcode them directly in your source files, especially for production deployments.**

    ```
    # Mapbox API Key (for Directions API and geocoding in reporting)
    REACT_APP_MAPBOX_ACCESS_TOKEN=pk.YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN_HERE

    # Firebase Configuration (from your Firebase project settings)
    REACT_APP_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
    REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
    REACT_APP_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
    REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
    REACT_APP_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
    ```
    *Replace placeholder values with your actual keys and IDs obtained from your Mapbox and Firebase project settings.*

### Firebase Setup

1.  **Initialize Firebase (`src/firebase.js`):**
    Ensure your `src/firebase.js` looks like this, using the environment variables for `firebaseConfig`:
    ```javascript
    // src/firebase.js
    import { initializeApp } from 'firebase/app';
    import { getFirestore } from 'firebase/firestore';
    import { getAuth, GoogleAuthProvider } from 'firebase/auth';

    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    export { db, auth, provider };
    ```
2.  **Firestore Security Rules:**
    In your Firebase Console, navigate to `Firestore Database > Rules` and ensure you have the following rules published to allow read/write access to traffic incidents:
    ```firestore
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // PUBLIC DATA: Allows anyone (authenticated or not) to read and write incidents.
        // Use this with caution in production if data integrity/security is critical.
        match /artifacts/{appId}/public/data/trafficIncidents/{documentId} {
          allow read, write: true;
        }

        // PRIVATE DATA: Authenticated users can read and write their own data.
        match /artifacts/{appId}/users/{userId}/{documents=**} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
    ```
3.  **Add Sample Data (Optional but Recommended):**
    To see incidents on the map immediately, manually add some sample documents to the `trafficIncidents` collection in your Firebase Console (`Firestore Database > Data`). The path should be `artifacts/{your_app_id}/public/data/trafficIncidents`. Each document should contain:
    * `description` (string)
    * `location` (map: `lat` (number), `lng` (number))
    * `reporterId` (string)
    * `timestamp` (timestamp)
    * `type` (string, e.g., "Accident", "Construction", "Traffic Jam", "Hazard", "Event", "Other")

## Usage

1.  **Start the development server:**
    ```bash
    npm start
    # or
    yarn start
    ```
2.  Open your browser and navigate to `http://localhost:3000` (or the address provided by your development server).
3.  **Login/Sign Up:** Create an account or log in.
4.  **Monitor Page (`/monitor`):** View live traffic incidents on the map and calculate routes.
5.  **Report Page (`/report`):** Report new incidents. Search for a location, provide details, and submit.
6.  **Learn Page (`/learn`):** Access road safety education materials.
