import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator, useWindowDimensions, Platform, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../constants/firebaseConfig';
import { addDoc, collection, query, where, getDocs, serverTimestamp, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import RenderHTML from 'react-native-render-html';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import Constants from 'expo-constants';
import { Rating } from 'react-native-ratings';
import { Calendar } from 'react-native-calendars';

export default function DetailsScreen() {
  const { bookId } = useLocalSearchParams();
  const router = useRouter();
  const [bookDetails, setBookDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { width } = useWindowDimensions();

  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [bookInList, setBookInList] = useState(null);
  const [newStartDate, setNewStartDate] = useState(null);
  const [newFinishDate, setNewFinishDate] = useState(null);
  const [dateTypeToSet, setDateTypeToSet] = useState('start');

  const apiKey = Platform.select({
    android: process.env.EXPO_PUBLIC_ANDROID_API_KEY,
    web: process.env.EXPO_PUBLIC_WEB_API_KEY,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}?key=${apiKey}`);
        const data = await response.json();
        if (response.ok) {
          setBookDetails(data);
        } else {
          setError(data.error.message || 'Error al cargar los detalles del libro');
        }
      } catch (_error) {
        setError('Error de red o al procesar la solicitud');
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchBookDetails();
    }
  }, [bookId, apiKey]);

  const checkBookInList = React.useCallback(async () => {
    if (currentUser && bookDetails) {
      const booksRef = collection(db, 'books');
      const q = query(
        booksRef,
        where('userId', '==', currentUser.uid),
        where('bookId', '==', bookDetails.id)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const bookDoc = querySnapshot.docs[0];
        setBookInList({ id: bookDoc.id, ...bookDoc.data() });
      } else {
        setBookInList(null);
      }
    }
  }, [currentUser, bookDetails]);

  useEffect(() => {
    checkBookInList();
  }, [currentUser, bookDetails, checkBookInList]);

  const handleRating = async (rating) => {
    if (bookInList) {
      try {
        const bookRef = doc(db, 'books', bookInList.id);
        await updateDoc(bookRef, { rating });
        setBookInList({ ...bookInList, rating });
      } catch (_error) {
        Alert.alert('Error', 'No se pudo guardar la valoración.');
      }
    }
  };

  const handleUpdateDates = async () => {
    if (bookInList && (newStartDate || newFinishDate)) {
      try {
        const bookRef = doc(db, 'books', bookInList.id);
        const updateData = {};
        if (newStartDate) {
          updateData.startDate = Timestamp.fromDate(new Date(newStartDate));
        }
        if (newFinishDate) {
          updateData.finishDate = Timestamp.fromDate(new Date(newFinishDate));
        }
        await updateDoc(bookRef, updateData);
        checkBookInList(); // Re-fetch book data
        setShowDateModal(false);
        setNewStartDate(null);
        setNewFinishDate(null);
      } catch (error) {
        console.error("Error updating dates: ", error);
        Alert.alert('Error', 'No se pudieron actualizar las fechas.');
      }
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </LinearGradient>
    );
  }

  if (!bookDetails) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.centered}>
        <Text style={{color: COLORS.text}}>No se encontraron detalles para este libro.</Text>
      </LinearGradient>
    );
  }

  const { volumeInfo } = bookDetails;
  const coverUrl = volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail : null;
  const description = volumeInfo.description || 'No hay descripción disponible.';

  const isbn10 = volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier;
  const isbn13 = volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier;
  const displayIsbn = isbn13 || isbn10 || 'No disponible';

  const categories = volumeInfo.categories || [];

  const source = {
    html: description
  };

  const baseStyle = {
    color: COLORS.text,
    fontFamily: FONTS.regular,
    fontSize: SIZES.font,
  };

  const tagsStyles = {
    p: {
      marginBottom: SIZES.small,
      lineHeight: SIZES.large,
    },
    b: {
      fontWeight: 'bold',
    },
    i: {
      fontStyle: 'italic',
    },
    h1: {
      fontSize: SIZES.extraLarge * 1.2,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginBottom: SIZES.medium,
      marginTop: SIZES.large,
    },
    h2: {
      fontSize: SIZES.extraLarge,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginBottom: SIZES.small,
      marginTop: SIZES.medium,
    },
    h3: {
      fontSize: SIZES.large * 1.2,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginBottom: SIZES.small,
      marginTop: SIZES.small,
    },
    h4: {
      fontSize: SIZES.large,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginBottom: SIZES.small,
    },
    h5: {
      fontSize: SIZES.medium,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginBottom: SIZES.small,
    },
    h6: {
      fontSize: SIZES.font,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginBottom: SIZES.small,
    },
  };

  const handleAddToMyReading = async (newList) => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para gestionar tus libros.');
      return;
    }

    try {
      const bookRef = bookInList ? doc(db, 'books', bookInList.id) : null;
      const now = serverTimestamp();

      if (bookRef) {
        if (bookInList.listName === newList) {
          Alert.alert('Información', `Este libro ya se encuentra en la lista "${newList}".`);
          setShowAddToListModal(false);
          return;
        }

        const updateData = {
          listName: newList,
          lastDateRead: now,
        };

        if (newList === 'Leyendo' && !bookInList.startDate) {
          updateData.startDate = now;
        }

        if (newList === 'Terminados') {
          updateData.finishDate = now;
        }

        await updateDoc(bookRef, updateData);

      } else {
        const bookData = {
          userId: currentUser.uid,
          listName: newList,
          title: volumeInfo.title || 'Sin título',
          author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Autor desconocido',
          coverUrl: coverUrl ? coverUrl.replace('http://', 'https://') : null,
          description: description,
          bookId: bookDetails.id,
          dateAdded: now,
          lastDateRead: now,
          currentPage: newList === 'Leyendo' ? 0 : null,
          totalPages: volumeInfo.pageCount || 0,
          categories: categories,
          rating: 0,
        };

        if (newList === 'Leyendo') {
          bookData.startDate = now;
        }
        if (newList === 'Terminados') {
          bookData.finishDate = now;
        }

        await addDoc(collection(db, 'books'), bookData);
      }

      await checkBookInList();

      if (newList === 'Terminados') {
        setShowAddToListModal(false);
        setShowRatingModal(true);
      } else {
        setShowAddToListModal(false);
        router.back();
      }
    } catch (error) {
      console.error('Error al gestionar el libro:', error);
      Alert.alert('Error', 'No se pudo completar la operación.');
    }
  };
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('es-ES');
  };

  return (
    <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.container}>
        {coverUrl && (
          <TouchableOpacity onPress={() => setShowImageModal(true)}>
            <Image source={{ uri: coverUrl.replace('http://', 'https://') }} style={styles.coverImage} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{volumeInfo.title}</Text>
        <Text style={styles.author}>{volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Autor desconocido'}</Text>

        <Text style={styles.isbnText}>ISBN: {displayIsbn}</Text>
        {volumeInfo.pageCount && (
          <Text style={styles.isbnText}>Páginas: {volumeInfo.pageCount}</Text>
        )}

        {categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            <View style={styles.categoryLabel}>
              <Text style={styles.categoryText}>{categories[0]}</Text>
            </View>
          </View>
        )}

        {bookInList && bookInList.listName === 'Terminados' && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingTitle}>Tu Valoración</Text>
            <Rating
              type='star'
              ratingCount={5}
              imageSize={40}
              onFinishRating={handleRating}
              startingValue={bookInList.rating || 0}
              tintColor={COLORS.secondary}
            />
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>Inicio: {formatDate(bookInList.startDate)}</Text>
              <Text style={styles.dateText}>Fin: {formatDate(bookInList.finishDate)}</Text>
            </View>
            <TouchableOpacity style={styles.editDatesButton} onPress={() => setShowDateModal(true)}>
              <Text style={styles.editDatesButtonText}>Editar Fechas</Text>
            </TouchableOpacity>
          </View>
        )}

        <RenderHTML contentWidth={width} source={source} tagsStyles={tagsStyles} baseStyle={baseStyle} />

        {currentUser && (
          <TouchableOpacity
            style={[styles.addToListButton, { backgroundColor: COLORS.primary }]}
            onPress={() => setShowAddToListModal(true)}
          >
            <Text style={styles.addToListButtonText}>Añadir a mi lectura</Text>
          </TouchableOpacity>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={showAddToListModal}
          onRequestClose={() => setShowAddToListModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Añadir a lista:</Text>
              <TouchableOpacity
                style={styles.modalOptionButton}
                onPress={() => handleAddToMyReading('Leyendo')}
              >
                <Text style={styles.modalOptionButtonText}>Leyendo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOptionButton}
                onPress={() => handleAddToMyReading('Pendientes')}
              >
                <Text style={styles.modalOptionButtonText}>Pendientes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOptionButton}
                onPress={() => handleAddToMyReading('Terminados')}
              >
                <Text style={styles.modalOptionButtonText}>Terminados</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOptionButton}
                onPress={() => handleAddToMyReading('Abandonados')}
              >
                <Text style={styles.modalOptionButtonText}>Abandonados</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOptionButton, styles.modalCancelButton]}
                onPress={() => setShowAddToListModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showRatingModal}
          onRequestClose={() => setShowRatingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>¡Libro terminado!</Text>
              <Text style={styles.modalSubtitle}>¿Qué te ha parecido?</Text>
              <Rating
                type='star'
                ratingCount={5}
                imageSize={40}
                showRating
                onFinishRating={handleRating}
                style={{ paddingVertical: 20 }}
              />
              <TouchableOpacity
                style={[styles.modalOptionButton, { backgroundColor: COLORS.primary }]}
                onPress={() => {
                  setShowRatingModal(false);
                  router.back();
                }}
              >
                <Text style={styles.modalOptionButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent={true}
          visible={showImageModal}
          onRequestClose={() => setShowImageModal(false)}
        >
          <TouchableOpacity style={styles.fullScreenImageContainer} onPress={() => setShowImageModal(false)}>
            {coverUrl && <Image source={{ uri: coverUrl.replace('http://', 'https://') }} style={styles.fullScreenImage} resizeMode="contain" />}
          </TouchableOpacity>
        </Modal>

        <Modal
            animationType="slide"
            transparent={true}
            visible={showDateModal}
            onRequestClose={() => setShowDateModal(false)} >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Editar Fechas</Text>
                    <View style={styles.dateSelectionContainer}>
                        <TouchableOpacity 
                            style={[styles.dateSelectionButton, dateTypeToSet === 'start' && styles.dateSelectionButtonActive]}
                            onPress={() => setDateTypeToSet('start')} >
                            <Text style={styles.dateSelectionButtonText}>Inicio: {newStartDate ? new Date(newStartDate).toLocaleDateString('es-ES') : 'Seleccionar'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.dateSelectionButton, dateTypeToSet === 'finish' && styles.dateSelectionButtonActive]}
                            onPress={() => setDateTypeToSet('finish')} >
                            <Text style={styles.dateSelectionButtonText}>Fin: {newFinishDate ? new Date(newFinishDate).toLocaleDateString('es-ES') : 'Seleccionar'}</Text>
                        </TouchableOpacity>
                    </View>
                    <Calendar
                        onDayPress={(day) => {
                            if (dateTypeToSet === 'start') {
                                setNewStartDate(day.dateString);
                            } else {
                                setNewFinishDate(day.dateString);
                            }
                        }}
                        markedDates={{
                            ...(newStartDate && { [newStartDate]: { selected: true, marked: true, selectedColor: COLORS.primary } }),
                            ...(newFinishDate && { [newFinishDate]: { selected: true, marked: true, selectedColor: COLORS.primary } }),
                        }}
                        theme={{
                            backgroundColor: COLORS.white,
                            calendarBackground: COLORS.white,
                            textSectionTitleColor: COLORS.text,
                            selectedDayBackgroundColor: COLORS.primary,
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: COLORS.primary,
                            dayTextColor: COLORS.text,
                            textDisabledColor: COLORS.lightText,
                            arrowColor: COLORS.primary,
                            monthTextColor: COLORS.text,
                        }}
                    />
                    <TouchableOpacity style={styles.modalOptionButton} onPress={handleUpdateDates}>
                        <Text style={styles.modalOptionButtonText}>Guardar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalOptionButton, styles.modalCancelButton]} onPress={() => setShowDateModal(false)}>
                        <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SIZES.medium,
    paddingBottom: SIZES.extraLarge * 2, 
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: 150,
    height: 225,
    alignSelf: 'center',
    marginBottom: SIZES.medium,
    resizeMode: 'contain',
    borderRadius: SIZES.small,
    ...SHADOWS.medium,
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: SIZES.small,
    color: COLORS.text,
  },
  author: {
    fontSize: SIZES.large,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    color: COLORS.lightText,
    marginBottom: SIZES.medium,
  },
  loadingText: {
    marginTop: SIZES.small,
    fontSize: SIZES.font,
    color: COLORS.text,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.font,
  },
  addToListButton: {
    marginTop: SIZES.large,
    alignSelf: 'center',
    width: '80%',
    borderRadius: SIZES.small,
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  addToListButtonText: {
    color: COLORS.white,
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    padding: SIZES.large,
    width: '80%',
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  modalOptionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.small,
    marginBottom: SIZES.small,
    alignItems: 'center',
  },
  modalOptionButtonText: {
    color: COLORS.white,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
  },
  modalCancelButton: {
    backgroundColor: COLORS.lightText,
    marginTop: SIZES.small,
  },
  modalCancelButtonText: {
    color: COLORS.white,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
  },
  fullScreenImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  isbnText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
    textAlign: 'center',
    marginTop: SIZES.small,
    marginBottom: SIZES.medium,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: SIZES.medium,
  },
  categoryLabel: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.small,
    paddingHorizontal: SIZES.small,
    paddingVertical: SIZES.tiny,
    marginHorizontal: SIZES.tiny,
    marginBottom: SIZES.tiny,
  },
  categoryText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
  },
  ratingContainer: {
    marginTop: SIZES.medium,
    padding: SIZES.medium,
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.medium,
    ...SHADOWS.light,
  },
  ratingTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  dateContainer: {
    marginTop: SIZES.medium,
    alignItems: 'center',
  },
  dateText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
  },
  editDatesButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.small,
    marginTop: SIZES.medium,
    alignItems: 'center',
  },
  editDatesButtonText: {
    color: COLORS.white,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
  },
  dateSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SIZES.medium,
  },
  dateSelectionButton: {
    padding: SIZES.small,
    borderRadius: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.lightText,
  },
  dateSelectionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateSelectionButtonText: {
    color: COLORS.text,
  },
});