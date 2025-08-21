import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';
import SearchBookItem from '../../components/SearchBookItem';

import Constants from 'expo-constants';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);

  const apiKey = Platform.select({
    android: process.env.EXPO_PUBLIC_ANDROID_API_KEY,
    web: process.env.EXPO_PUBLIC_WEB_API_KEY,
  });

  const searchBooks = async () => {
    console.log('Using API Key:', apiKey);
    if (!query.trim()) {
      setBooks([]);
      return;
    }

    const isIsbn = (text) => {
      // Regex más estricta para ISBN-10 (10 dígitos) o ISBN-13 (13 dígitos)
      const isbn10Regex = /^(?:ISBN(?:-10)?:?)(?=[0-9X]{10}$)([0-9]{9}[0-9X])$/i;
      const isbn13Regex = /^(?:ISBN(?:-13)?:?)(?=[0-9]{13}$)([0-9]{3}-){2}[0-9]{3}[0-9X]$|^([0-9]{13})$/i;
      const cleanText = text.replace(/[-\s]/g, ''); // Eliminar guiones y espacios
      return isbn10Regex.test(cleanText) || isbn13Regex.test(cleanText);
    };

    let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=`;
    if (isIsbn(query)) {
      apiUrl += `isbn:${encodeURIComponent(query.replace(/[-\s]/g, ''))}&maxResults=1`; // Buscar por ISBN y limitar a 1 resultado
    } else {
      apiUrl += encodeURIComponent(query); // Buscar por título/autor
    }
    apiUrl += `&key=${apiKey}`;
    console.log('Requesting URL:', apiUrl);

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data && data.items) {
        // Para búsqueda por ISBN, no filtrar por imageLinks, ya que queremos el libro exacto
        const fetchedBooks = data.items.map((item) => ({
          key: item.id,
          title: item.volumeInfo.title || 'N/A',
          author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'N/A',
          coverUrl: item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : null,
        }));
        setBooks(fetchedBooks);
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
    }
  };

  const router = useRouter();

  const handleBookPress = (bookId) => {
    router.push({ pathname: 'details', params: { bookId } });
  };

  return (
    <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={{flex: 1}}>
      <View style={[styles.container]}>
        <View style={styles.searchSection}>
          <TextInput
            style={styles.input}
            placeholder="Buscar libros..."
            placeholderTextColor={COLORS.lightText}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchBooks} // Añadido para buscar al pulsar Intro
          />
          <TouchableOpacity style={styles.searchButton} onPress={searchBooks}>
            <Text style={styles.searchButtonText}>Buscar</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={books}
          keyExtractor={(item) => item.key}
          renderItem={({ item, index }) => (
            <SearchBookItem item={item} index={index} handleBookPress={handleBookPress} />
          )}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SIZES.medium,
    paddingTop: 50,
  },
  searchSection: {
    marginBottom: SIZES.medium,
  },
  input: {
    height: 50,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: SIZES.small,
    marginBottom: SIZES.medium,
    paddingHorizontal: SIZES.medium,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: 'center',
    marginBottom: SIZES.medium,
    ...SHADOWS.medium,
  },
  searchButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
  },
  bookItem: {
    padding: SIZES.medium,
    borderBottomColor: COLORS.lightText,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginBottom: SIZES.small,
    borderRadius: SIZES.small,
    ...SHADOWS.light,
  },
  coverImage: {
    width: 80,
    height: 120,
    marginRight: SIZES.medium,
    resizeMode: 'contain',
    borderRadius: SIZES.small,
  },
  bookDetails: {
    flex: 1,
  },
  title: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  author: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
  },
});