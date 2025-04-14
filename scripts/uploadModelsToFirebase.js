// Import Firebase modules
import { collection, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../src/data/firebase.js';

// Get directory name (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadModelsToFirebase() {
  try {
    // Read models from the JSON file
    const modelsPath = path.join(__dirname, '../public/models.json');
    const modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
    const models = modelsData.models;
    
    console.log(`Found ${models.length} models to upload...`);
    
    // Use batch writing for better performance
    const batch = writeBatch(db);
    
    // Add each model to the batch
    models.forEach((model) => {
      // Add a timestamp for when it was uploaded
      const modelWithTimestamp = {
        ...model,
        uploadedAt: new Date().toISOString()
      };
      
      // Create a reference to a new document with auto-generated ID
      const newModelRef = doc(collection(db, 'huggingface_models'));
      batch.set(newModelRef, modelWithTimestamp);
      
      console.log(`Prepared model: ${model.name} (${model.id})`);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log('🎉 Success! All models have been uploaded to Firebase.');
  } catch (error) {
    console.error('Error uploading models to Firebase:', error);
  }
}

// Run the function
uploadModelsToFirebase();

/*
To use this script:
1. Run this script with Node.js:
   node --experimental-modules scripts/uploadModelsToFirebase.js

This script will:
- Read the models from public/models.json
- Add each model to the 'huggingface_models' collection in Firestore
- Add a timestamp to each model
- Use batch writing for efficiency
*/ 