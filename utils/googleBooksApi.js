import { Platform } from 'react-native';

import Constants from 'expo-constants';

const apiKey = Platform.select({
  android: process.env.EXPO_PUBLIC_ANDROID_API_KEY,
  web: process.env.EXPO_PUBLIC_WEB_API_KEY,
});

export const fetchBookDetailsFromGoogleBooks = async (title, author, isbn) => {
  let query = '';
  if (isbn) {
    query = `isbn:${encodeURIComponent(isbn)}`;
  } else if (title) {
    query += `intitle:${encodeURIComponent(title)}`;
    if (author) {
      query += `+inauthor:${encodeURIComponent(author)}`;
    }
  } else if (author) {
    query += `inauthor:${encodeURIComponent(author)}`;
  }

  if (!query) {
    return null; // No hay suficiente información para buscar
  }

  const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data && data.items && data.items.length > 0) {
      const item = data.items[0];
      const volumeInfo = item.volumeInfo;
      return {
        bookId: item.id,
        totalPages: volumeInfo.pageCount || 0,
        categories: volumeInfo.categories || [],
        coverUrl: volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail.replace(/^http:/, 'https:') : null,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching book details from Google Books:", error);
    return null;
  }
};

export const fetchBookCover = async (title, author) => {
  const details = await fetchBookDetailsFromGoogleBooks(title, author, null);
  return details ? details.coverUrl : null;
};