import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { arrayUnion, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { getAllUserBooks, convertToCSV, downloadCSV } from '../../utils/exportUtils';

import { Rating } from 'react-native-ratings';
import { auth, db } from '../../constants/firebaseConfig';
import { COLORS, FONTS, SHADOWS, SIZES } from '../../constants/theme';
import ReadingListItem from '../../components/ReadingListItem';
import ReadingGridItem from '../../components/ReadingGridItem';

export default function ReadingListPage() {
  const { listName } = useLocalSearchParams();
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState(false);
  const [bookToDeleteId, setBookToDeleteId] = useState(null);

  const getGridNumColumns = (width) => {
    if (width < 400) {
      return 2; // For very small screens
    } else if (width < 768) {
      return 3; // For small to medium screens
    } else {
      return 4; // For larger screens
    }
  };

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [numColumns, setNumColumns] = useState(getGridNumColumns(screenWidth));
  const [itemWidth, setItemWidth] = useState(0);

  useEffect(() => {
    const updateDimensions = ({ window }) => {
      const newWidth = window.width;
      setScreenWidth(newWidth);
      const newNumColumns = getGridNumColumns(newWidth);
      setNumColumns(newNumColumns);

      // Calculate itemWidth considering FlatList padding and item margins
      const totalHorizontalPadding = 2 * SIZES.small; // from flatListStyle.paddingHorizontal
      const totalMarginBetweenItems = (newNumColumns - 1) * SIZES.medium; // Total margin between items
      const calculatedItemWidth = (newWidth - totalHorizontalPadding - totalMarginBetweenItems) / newNumColumns;
      setItemWidth(calculatedItemWidth);
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    updateDimensions({ window: Dimensions.get('window') }); // Initial call
    return () => {
      subscription.remove();
    };
  }, []);

  const fetchBooks = React.useCallback(async () => {
    if (!user || !listName) return;

    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'books'),
        where('userId', '==', user.uid),
        where('listName', '==', listName),
        orderBy('dateAdded', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedBooks = [];
      querySnapshot.forEach((doc) => {
        fetchedBooks.push({ id: doc.id, ...doc.data() });
      });
      setBooks(fetchedBooks);
    } catch (err) {
      console.error("Error fetching books:", err);
      setError('Error al cargar los libros.');
    } finally {
      setLoading(false);
    }
  }, [user, listName]);

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentBookToUpdate, setCurrentBookToUpdate] = useState(null);
  const [currentPageInput, setCurrentPageInput] = useState('');
  const [totalPagesInput, setTotalPagesInput] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user && listName) {
      fetchBooks();
    }
  }, [user, listName, fetchBooks]);

  useFocusEffect(
    React.useCallback(() => {
      fetchBooks();
    }, [user, listName, fetchBooks])
  );

  const confirmDelete = async () => {
    if (!bookToDeleteId) return;
    try {
      await deleteDoc(doc(db, 'books', bookToDeleteId));
      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookToDeleteId));
      // Alert.alert('Éxito', 'Libro eliminado correctamente.'); // Mensaje de éxito eliminado
    } catch (error) {
      console.error('Error removing document: ', error);
      Alert.alert('Error', 'No se pudo eliminar el libro.');
    } finally {
      setShowDeleteConfirmationModal(false);
      setBookToDeleteId(null);
    }
  };

  const handleDeleteBook = async (bookIdToDelete) => {
    setBookToDeleteId(bookIdToDelete);
    setShowDeleteConfirmationModal(true);
  };

  const handleBookPress = (bookId) => {
    router.push({ pathname: 'details', params: { bookId } });
  };

  const handleOpenProgressModal = (book) => {
    setCurrentBookToUpdate(book);
    setCurrentPageInput(book.currentPage ? String(book.currentPage) : '');
    setTotalPagesInput(book.totalPages ? String(book.totalPages) : '');
    setShowProgressModal(true);
  };

  const handleCompleteBook = async (rating) => {
    if (!currentBookToUpdate) return;

    try {
      const bookRef = doc(db, 'books', currentBookToUpdate.id);

      // Calcular las páginas restantes para marcar como avanzadas al completar el libro
      const pagesRemaining = (currentBookToUpdate.totalPages || 0) - (currentBookToUpdate.currentPage || 0);

      await updateDoc(bookRef, {
        listName: 'Terminados',
        rating: rating,
        // Añadir la fecha y las páginas restantes al array readingActivity
        readingActivity: arrayUnion({
          date: new Date(),
          pagesAdvanced: pagesRemaining,
        }),
        currentPage: currentBookToUpdate.totalPages || 0, // Establecer la página actual al total
      });

      // Eliminar el libro de la lista actual en la UI
      setBooks(prevBooks => prevBooks.filter(book => book.id !== currentBookToUpdate.id));
      setShowRatingModal(false);
    } catch (error) {
      console.error('Error completing book:', error);
      Alert.alert('Error', 'No se pudo marcar el libro como completado.');
    }
  };

  const handleAbandonBook = async () => {
    if (!currentBookToUpdate) return;

    try {
      const bookRef = doc(db, 'books', currentBookToUpdate.id);
      await updateDoc(bookRef, {
        listName: 'Abandonados',
        // Opcional: Puedes añadir un registro de actividad aquí si lo deseas
        // readingActivity: arrayUnion({
        //   date: new Date(),
        //   action: 'abandoned',
        // }),
      });

      // Eliminar el libro de la lista actual en la UI
      setBooks(prevBooks => prevBooks.filter(book => book.id !== currentBookToUpdate.id));
      setShowProgressModal(false);
    } catch (error) {
      console.error('Error abandoning book:', error);
      Alert.alert('Error', 'No se pudo marcar el libro como abandonado.');
    }
  };

  const handleUpdateProgress = async () => {
    if (!currentBookToUpdate) return;

    const page = parseInt(currentPageInput);
    const total = parseInt(totalPagesInput);

    if (isNaN(page) || isNaN(total) || page < 0 || total < 0 || page > total) {
      Alert.alert('Error', 'Por favor, introduce números válidos para las páginas.');
      return;
    }

    try {
      const bookRef = doc(db, 'books', currentBookToUpdate.id);

      // Obtener la página actual anterior
      const previousPage = currentBookToUpdate.currentPage || 0;
      const pagesAdvanced = page - previousPage;

      await updateDoc(bookRef, {
        currentPage: page,
        totalPages: total,
        // Añadir la fecha y las páginas avanzadas al array readingActivity
        readingActivity: arrayUnion({
          date: new Date(),
          pagesAdvanced: pagesAdvanced,
        }),
      });

      setBooks(prevBooks =>
        prevBooks.map(book =>
          book.id === currentBookToUpdate.id ? { ...book, currentPage: page, totalPages: total } : book
        )
      );
      setShowProgressModal(false);
    } catch (error) {
      console.error('Error updating progress:', error);
      Alert.alert('Error', 'No se pudo actualizar el progreso.');
    }
  };

  const renderBookItem = ({ item, index }) => {
    return (
      <View>
        <TouchableOpacity onPress={() => handleBookPress(item.bookId)} style={styles.bookItem}>
          {item.coverUrl ? (
            <Image source={{ uri: item.coverUrl }} style={styles.bookCover} />
          ) : (
            <Image source={require('../../assets/images/icon.png')} style={styles.bookCover} />
          )}
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1} ellipsizeMode="tail">{item.author}</Text>
            {listName === 'Leyendo' && item.currentPage !== null && item.totalPages !== null && (
              <>
                <Text style={styles.progressText}>Progreso: {item.currentPage} / {item.totalPages} ({(item.totalPages > 0 ? ((item.currentPage / item.totalPages) * 100) : 0).toFixed(0)}%)</Text>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${(item.currentPage / item.totalPages) * 100 || 0}%` }]} />
                </View>
              </>
            )}
          </View>
          <View style={styles.actionButtonsContainer}>
            {listName === 'Leyendo' && (
              <TouchableOpacity onPress={() => handleOpenProgressModal(item)} style={styles.updateProgressButton}>
                <MaterialCommunityIcons name="pencil" size={24} color={COLORS.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteBook(item.id); }} style={styles.deleteButton}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando libros...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.container}>
      <Stack.Screen 
        options={{
          title: listName ? `Lista: ${listName}` : 'Lista de Lectura',
          headerRight: () => (
            <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} style={{ marginRight: 15 }}>
              <MaterialCommunityIcons name={viewMode === 'list' ? 'grid' : 'view-list'} size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Contenido de la lista: {listName}</Text>
        {books.length > 0 ? (
          <FlatList
            key={`${viewMode}-${numColumns}`} // Cambiar la key fuerza el re-renderizado
            data={books}
            renderItem={({ item, index }) =>
              viewMode === 'list' ? (
                <ReadingListItem
                  item={item}
                  index={index}
                  listName={listName}
                  handleBookPress={handleBookPress}
                  handleOpenProgressModal={handleOpenProgressModal}
                  handleDeleteBook={handleDeleteBook}
                />
              ) : (
                <ReadingGridItem
                  item={item}
                  index={index}
                  handleBookPress={handleBookPress}
                  screenWidth={screenWidth}
                  numColumns={numColumns}
                  itemWidth={itemWidth}
                />
              )
            }
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'list' ? 1 : numColumns}
            contentContainerStyle={viewMode === 'list' ? styles.bookList : styles.gridContainer}
            columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : null}
            style={styles.flatListStyle}
          />
        ) : (
          <Text style={styles.noBooksText}>No hay libros en esta lista.</Text>
        )}
      </View>

      {/* Modal para actualizar progreso */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProgressModal}
        onRequestClose={() => setShowProgressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Actualizar Progreso</Text>
            <TextInput
              style={styles.input}
              placeholder="Página actual"
              keyboardType="numeric"
              value={currentPageInput}
              onChangeText={setCurrentPageInput}
              placeholderTextColor={COLORS.lightText}
            />
            <TextInput
              style={styles.input}
              placeholder="Total de páginas"
              keyboardType="numeric"
              value={totalPagesInput}
              onChangeText={setTotalPagesInput}
              placeholderTextColor={COLORS.lightText}
            />
            <View style={styles.modalActionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalOptionButton, styles.modalActionButton, { backgroundColor: COLORS.success }]} // Usar estilo base
                  onPress={() => {
                    setShowProgressModal(false);
                    setShowRatingModal(true);
                  }}
                >
                  <Text style={styles.modalOptionButtonText}>Terminado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOptionButton, styles.modalActionButton, { backgroundColor: COLORS.error }]} // Sobrescribir solo el color de fondo
                  onPress={handleAbandonBook}
                >
                  <Text style={styles.modalOptionButtonText}>Abandonado</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.modalOptionButton} onPress={handleUpdateProgress}>
                <Text style={styles.modalOptionButtonText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOptionButton, { backgroundColor: COLORS.lightText }]} // Sobrescribir solo el color de fondo
                onPress={() => setShowProgressModal(false)}
              >
                <Text style={styles.modalOptionButtonText}>Cancelar</Text>
              </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para valorar y completar */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRatingModal}
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¡Libro Terminado!</Text>
            <Text style={styles.modalSubtitle}>Valora este libro para guardarlo en {""}Terminados{""}</Text>
            <Rating
              type="star"
              ratingCount={5}
              imageSize={40}
              showRating
              onFinishRating={(rating) => handleCompleteBook(rating)}
              style={{ paddingVertical: 20 }}
            />
            <TouchableOpacity
              style={[styles.modalOptionButton, styles.modalCancelButton]}
              onPress={() => setShowRatingModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDeleteConfirmationModal}
        onRequestClose={() => setShowDeleteConfirmationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
            <Text style={styles.modalSubtitle}>¿Estás seguro de que quieres eliminar este libro de la lista?</Text>
            <View style={styles.modalActionButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalOptionButton, { backgroundColor: COLORS.lightText }]}
                onPress={() => setShowDeleteConfirmationModal(false)}
              >
                <Text style={styles.modalOptionButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOptionButton, { backgroundColor: COLORS.error }]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalOptionButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.small,
    paddingVertical: SIZES.large,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  bookList: {
    paddingHorizontal: SIZES.medium, // Aplicar padding horizontal al FlatList
  },
  bookItem: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium, // Increased border radius
    marginBottom: SIZES.small,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
    width: '100%', // Ocupa el 100% del ancho disponible dentro del padding del FlatList
    padding: SIZES.small, // Padding interno para el contenido del item
    ...SHADOWS.medium,
  },
  bookCover: {
    width: 60, // Ancho fijo para la portada
    height: 90, // Alto fijo para la portada
    borderRadius: SIZES.small / 2,
    marginRight: SIZES.small, // Margen a la derecha de la portada
    resizeMode: 'cover', // Changed to cover
  },
  bookInfo: {
    flex: 1, // Ocupa el espacio restante
    flexShrink: 1, // Permite que se encoja
    overflow: 'hidden', // Asegura que el texto se trunque si es necesario
    minWidth: 0, // Permite que el contenido se encoja más allá de su tamaño intrínseco
  },
  bookTitle: {
    color: COLORS.text,
    fontSize: SIZES.medium,
    fontFamily: FONTS.semiBold,
  },
  bookAuthor: {
    color: COLORS.lightText,
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    marginBottom: SIZES.tiny,
  },
  progressText: {
    color: COLORS.lightText,
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    marginTop: SIZES.tiny,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 45, // Increased width
    marginLeft: SIZES.medium, // Increased margin
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    width: 40, // Increased size
    height: 40, // Increased size
    borderRadius: 25, // Increased border radius
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.small, // Margen superior para separar del botón de progreso
  },
  updateProgressButton: {
    backgroundColor: COLORS.primary,
    width: 40, // Increased size
    height: 40, // Increased size
    borderRadius: 25, // Increased border radius
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.small,
    fontSize: SIZES.font,
    color: COLORS.text,
  },
  errorText: {
    color: 'red',
    fontSize: SIZES.font,
  },
  noBooksText: {
    color: COLORS.lightText,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    marginTop: SIZES.medium,
  },
  flatListStyle: {
    flex: 1,
    width: '100%',
    paddingHorizontal: SIZES.small, // Reverted padding
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.small,
    padding: SIZES.large,
    width: '80%',
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: COLORS.lightText,
    borderWidth: 1,
    borderRadius: SIZES.small,
    marginBottom: SIZES.medium,
    paddingHorizontal: SIZES.medium,
    color: COLORS.text,
  },
  modalOptionButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  modalOptionButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
  },
  modalActionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridContainer: {
    justifyContent: 'flex-start', // Changed to flex-start for predictable spacing
    alignItems: 'center',
    paddingHorizontal: 0, // Removed padding
    paddingVertical: SIZES.medium,
  },
  gridBookItem: {
    marginHorizontal: SIZES.medium / 2, // Increased horizontal separation
    marginBottom: SIZES.medium, // Increased vertical separation
    borderRadius: SIZES.small / 2,
    overflow: 'hidden',
    ...SHADOWS.medium,
    // The width and height are now passed directly to ReadingGridItem
  },
  columnWrapperStyle: {
    justifyContent: 'space-around',
  },
})