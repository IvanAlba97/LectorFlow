import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

// Función para obtener todos los libros del usuario
export const getAllUserBooks = async (userId) => {
  if (!userId) {
    console.error("User ID is required to fetch books.");
    return [];
  }
  try {
    const q = query(
      collection(db, 'books'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const fetchedBooks = [];
    querySnapshot.forEach((doc) => {
      fetchedBooks.push({ id: doc.id, ...doc.data() });
    });
    return fetchedBooks;
  } catch (error) {
    console.error("Error fetching all user books:", error);
    return [];
  }
};

// Función para convertir un array de objetos a CSV
export const convertToCSV = (data) => {
  if (data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + row[header]).replace(/"/g, '""'); // Escape double quotes
      return `"${escaped}"`; // Enclose in double quotes
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

// Función para descargar/guardar el archivo CSV
export const downloadCSV = async (csvString, filename = 'lecturas.csv') => {
  if (Platform.OS === 'web') {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Native (Android/iOS)
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const uri = permissions.directoryUri;
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(uri, filename, 'text/csv');
        await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
        
      } else {
        alert('Permiso de almacenamiento denegado. No se pudo guardar el archivo.');
      }
    } catch (error) {
      console.error("Error saving CSV file:", error);
      alert('Error al guardar el archivo CSV.');
    }
  }
};
