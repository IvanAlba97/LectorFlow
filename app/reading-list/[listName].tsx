import { useLocalSearchParams, useFocusEffect, useRouter, Stack } from 'expo-router';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, addDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../constants/firebaseConfig';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import ReadingListItem from '../../components/ReadingListItem';
import ReadingGridItem from '../../components/ReadingGridItem';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ReadingListScreen() {
  const { listName } = useLocalSearchParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [newProgress, setNewProgress] = useState('');
  const [newTotalPages, setNewTotalPages] = useState('');
  const [inputType, setInputType] = useState('pages'); // 'pages' or 'percentage'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const numColumns = screenWidth < 768 ? 3 : 4;
  const itemWidth = (screenWidth - (SIZES.medium * (numColumns + 1))) / numColumns;

  useEffect(() => {
    const onChange = ({ window }) => {
      setScreenWidth(window.width);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (!currentUser) {
          setLoading(false);
          setBooks([]);
        }
      });
      return () => unsubscribeAuth();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        setLoading(true);
        const q = query(
          collection(db, 'books'),
          where('userId', '==', user.uid),
          where('listName', '==', listName)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const userBooks = [];
          querySnapshot.forEach((doc) => {
            userBooks.push({ id: doc.id, ...doc.data() });
          });
          setBooks(userBooks);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching books:", error);
          setLoading(false);
        });

        return () => unsubscribe();
      }
    }, [user, listName])
  );

  useEffect(() => {
    if (!progressModalVisible || !selectedBook) return;

    if (inputType === 'percentage') {
        const currentPage = selectedBook.currentPage || 0;
        const totalPages = parseInt(newTotalPages, 10) || selectedBook.totalPages || 0;
        if (totalPages > 0) {
            const percentage = Math.round((currentPage / totalPages) * 100);
            setNewProgress(percentage.toString());
        } else {
            setNewProgress('0');
        }
    } else {
        setNewProgress(selectedBook.currentPage?.toString() || '0');
    }
  }, [inputType, progressModalVisible]);

  const handleDeleteBook = (bookId) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar este libro de tu lista?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "books", bookId));
            } catch (error) {
              console.error("Error deleting book:", error);
              Alert.alert("Error", "No se pudo eliminar el libro.");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleOpenProgressModal = (book) => {
    setSelectedBook(book);
    setInputType('pages'); // Default to pages
    setNewProgress(book.currentPage?.toString() || '');
    setNewTotalPages(book.totalPages?.toString() || '');
    setProgressModalVisible(true);
  };

  const handleBookPress = (bookId) => {
    router.push({ pathname: 'details', params: { bookId } });
  };

  const handleUpdateProgress = async () => {
    if (!selectedBook || newProgress === '') return;

    let finalCurrentPage = parseInt(newProgress, 10);
    let finalTotalPages = parseInt(newTotalPages, 10);

    if (isNaN(finalCurrentPage) || finalCurrentPage < 0) {
        Alert.alert("Entrada no válida", "Por favor, introduce un número positivo.");
        return;
    }

    if (inputType === 'pages') {
        if (isNaN(finalTotalPages) || finalTotalPages <= 0) {
            Alert.alert("Entrada no válida", "El total de páginas debe ser un número positivo.");
            return;
        }
        if (finalCurrentPage > finalTotalPages) {
            Alert.alert("Entrada no válida", `La página actual no puede ser mayor que el total.`);
            return;
        }
    } else { // percentage
        if (finalCurrentPage > 100) {
            Alert.alert("Entrada no válida", "El porcentaje no puede ser mayor que 100.");
            return;
        }
        finalTotalPages = selectedBook.totalPages;
        finalCurrentPage = Math.round((finalCurrentPage / 100) * finalTotalPages);
    }

    try {
      const bookRef = doc(db, 'books', selectedBook.id);
      const pagesAdvanced = finalCurrentPage - (selectedBook.currentPage || 0);

      const updateData = {
        currentPage: finalCurrentPage,
        lastDateRead: serverTimestamp(),
      };

      if (pagesAdvanced > 0) {
        updateData.readingActivity = arrayUnion({
          date: new Date(),
          pagesAdvanced: pagesAdvanced,
        });
      }

      if (inputType === 'pages') {
        updateData.totalPages = finalTotalPages;
      }

      await updateDoc(bookRef, updateData);

      setProgressModalVisible(false);
      setSelectedBook(null);
      setNewProgress('');
      setNewTotalPages('');
    } catch (error) {
      console.error("Error updating progress:", error);
      Alert.alert("Error", "No se pudo actualizar el progreso.");
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.container}>
        <Stack.Screen
            options={{
                headerRight: () => (
                    <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} style={{ marginRight: 15 }}>
                        <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid' : 'view-list'} size={24} color={COLORS.text} />
                    </TouchableOpacity>
                ),
            }}
        />
      <Text style={styles.listTitle}>{listName}</Text>
      {books.length > 0 ? (
        <FlatList
          data={books}
          key={`${viewMode}-${numColumns}`}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? numColumns : 1}
          columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-around' } : null}
          renderItem={({ item, index }) => {
            if (viewMode === 'list') {
              return (
                <ReadingListItem
                  item={item}
                  index={index}
                  listName={listName}
                  handleBookPress={handleBookPress}
                  handleOpenProgressModal={handleOpenProgressModal}
                  handleDeleteBook={handleDeleteBook}
                />
              );
            } else {
              return (
                <ReadingGridItem
                  item={item}
                  index={index}
                  handleBookPress={handleBookPress}
                  itemWidth={itemWidth}
                />
              );
            }
          }}
          contentContainerStyle={viewMode === 'list' ? { paddingHorizontal: SIZES.medium } : {}}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyListText}>No hay libros en esta lista.</Text>
        </View>
      )}

      {/* Progress Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={progressModalVisible}
        onRequestClose={() => setProgressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Actualizar Progreso</Text>
            <View style={styles.inputTypeSelector}>
              <TouchableOpacity 
                style={[styles.inputTypeButton, inputType === 'pages' && styles.inputTypeButtonActive]}
                onPress={() => setInputType('pages')}>
                  <Text style={[styles.inputTypeButtonText, inputType === 'pages' && styles.inputTypeButtonTextActive]}>Páginas</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.inputTypeButton, inputType === 'percentage' && styles.inputTypeButtonActive]}
                onPress={() => setInputType('percentage')}>
                  <Text style={[styles.inputTypeButtonText, inputType === 'percentage' && styles.inputTypeButtonTextActive]}>Porcentaje</Text>
              </TouchableOpacity>
            </View>
            
            {inputType === 'pages' ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  value={newProgress}
                  onChangeText={setNewProgress}
                  placeholder={`Página actual`}
                />
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  value={newTotalPages}
                  onChangeText={setNewTotalPages}
                  placeholder={`Páginas totales`}
                />
              </>
            ) : (
              <TextInput
                style={styles.modalInput}
                keyboardType="number-pad"
                value={newProgress}
                onChangeText={setNewProgress}
                placeholder={`Porcentaje actual (0-100)`}
              />
            )}

            <TouchableOpacity style={styles.modalButton} onPress={handleUpdateProgress}>
              <Text style={styles.modalButtonText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: COLORS.lightText }]}
              onPress={() => setProgressModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SIZES.large,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SIZES.medium,
  },
  emptyListText: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
  },
  // Modal Styles
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
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.lightText,
    borderRadius: SIZES.small,
    padding: SIZES.small,
    marginBottom: SIZES.medium,
    fontSize: SIZES.medium,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  modalButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
  },
  inputTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SIZES.medium,
  },
  inputTypeButton: {
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.lightText,
    marginHorizontal: SIZES.small, // Añadido para dar separación
  },
  inputTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  inputTypeButtonText: {
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  inputTypeButtonTextActive: {
    color: COLORS.white,
  },
})