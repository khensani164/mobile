import API_URL from "@/config";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { useAdminVenue } from "../../hooks/Admin/useVanue"; // make sure path is correct
const { width } = Dimensions.get("window");

export default function AvailableVenues() {

  const [availableTools, setAvailableTools] = useState([]);
  const [selectedToolIds, setSelectedToolIds] = useState([]); // Stores IDs of selected tools
  const {
    venues,
    addNewVenue,
    updateExistingVenue,
    deleteExistingVenue,
    reload,
    loading,
  } = useAdminVenue();

  const [searchQuery, setSearchQuery] = useState("");
  const [venueData, setVenueData] = useState({
    id: null,
    name: "",
    location: "",
    price: "",
    capacity: "",
    previewImages: [],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) return venues || [];
    const query = searchQuery.toLowerCase();
    return (venues || []).filter(
      (venue) =>
        venue.location?.toLowerCase().includes(query) ||
        venue.name?.toLowerCase().includes(query)
    );
  }, [venues, searchQuery]);



  // ✅ Function to fetch tools
  const fetchTools = async () => {
    try {
      const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");
      const res = await fetch(`${API_URL}/admin/tools`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
      });
      const result = await res.json();
      if (result.data) {
        setAvailableTools(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch tools", error);
    }
  };

  // ✅ Update openModal to fetch tools and reset selection
  const openModal = async () => {
    await fetchTools(); // Fetch tools when opening modal
    setVenueData({
      id: null,
      name: "",
      location: "",
      price: "",
      capacity: "",
      previewImages: [],
    });
    setSelectedToolIds([]); // Reset tools
    setEditMode(false);
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedImages = result.assets.map((a) => a.uri);
      setVenueData({
        ...venueData,
        previewImages: [...venueData.previewImages, ...selectedImages],
      });
    }
  };

  const handleDeleteImage = (index) => {
    const updatedImages = venueData.previewImages.filter((_, i) => i !== index);
    setVenueData({ ...venueData, previewImages: updatedImages });
  };

  const handleSave = async () => {
    if (!venueData.name || !venueData.location || !venueData.price || !venueData.capacity) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Merge selected tools into the data object
    const payload = {
      ...venueData,
      tools: selectedToolIds // ✅ Send array of IDs [ "uuid-1", "uuid-2" ]
    };

    try {
      if (editMode) {
        await updateExistingVenue(payload);
        Alert.alert("Updated", "Venue updated successfully!");
      } else {
        await addNewVenue(payload);
        Alert.alert("Saved", "Venue added successfully!");
      }
      setModalVisible(false);
      reload();
    } catch (error) {
      console.error("Save failed:", error);
      Alert.alert("Error", "Failed to save venue.");
    }
  };

  // ✅ Update handleEdit to pre-fill selected tools
  const handleEdit = async (venue) => {
    await fetchTools();
    setVenueData(venue);
    // Assuming venue.tools is an array of objects like [{id: 1, name: 'Mic'}]
    const currentToolIds = venue.tools ? venue.tools.map(t => t.id) : [];
    setSelectedToolIds(currentToolIds);

    setEditMode(true);
    setModalVisible(true);
  };

  // ✅ Toggle Tool Selection Logic
  const toggleTool = (toolId) => {
    setSelectedToolIds((prev) => {
      if (prev.includes(toolId)) {
        return prev.filter((id) => id !== toolId); // Remove
      } else {
        return [...prev, toolId]; // Add
      }
    });
  };


  const handleDelete = async (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this venue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deleteExistingVenue(id);
            Alert.alert("Deleted", "Venue deleted successfully!");
            reload();
          } catch (error) {
            console.error("Delete failed:", error);
            Alert.alert("Error", "Failed to delete venue.");
          }
        },
        style: "destructive",
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Venues</Text>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#0077B6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by campus or building"
          placeholderTextColor={"#999"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={openModal}>
        <MaterialCommunityIcons name="plus-circle" size={22} color="#fff" />
        <Text style={styles.addText}>Add Venue</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredVenues}
        keyExtractor={(item, index) => (item?.id ? item.id.toString() : index.toString())}
        ListEmptyComponent={<Text style={styles.emptyText}>{loading ? "Loading..." : "No venues available"}</Text>}
        contentContainerStyle={styles.flatListContainer}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.previewImages?.length > 0 ? (
              <Carousel
                width={width - 80}
                height={160}
                autoPlay={false}
                data={item.previewImages}
                scrollAnimationDuration={500}
                renderItem={({ item: img }) => (
                  <Image source={{ uri: img }} style={styles.carouselImage} />
                )}
              />
            ) : (
              <View style={styles.placeholder}>
                <MaterialCommunityIcons name="image-off" size={40} color="#0077B6" />
              </View>
            )}

            <View style={styles.cardContent}>
              <Text style={styles.venueName}>{item.name}</Text>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#0077B6" />
                <Text style={styles.details}>{item.location}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cash" size={16} color="#0077B6" />
                <Text style={styles.details}>R{item.price}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-group" size={16} color="#0077B6" />
                <Text style={styles.details}>Capacity: {item.capacity}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <MaterialCommunityIcons name="pencil" size={20} color="#0077B6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <MaterialCommunityIcons name="delete" size={20} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalHeader}>{editMode ? "Edit Venue" : "Add Venue"}</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              <MaterialCommunityIcons name="camera-plus" size={40} color="#0077B6" />
              <Text style={{ color: "#0077B6", marginTop: 5 }}>Add Images</Text>
            </TouchableOpacity>

            {venueData.previewImages?.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {venueData.previewImages.map((img, i) => (
                  <View key={i} style={{ marginRight: 10 }}>
                    <Image source={{ uri: img }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.deleteImageButton}
                      onPress={() => handleDeleteImage(i)}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="red" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TextInput
              placeholder="Venue Name"
              placeholderTextColor={"#999"}
              value={venueData.name}
              onChangeText={(text) => setVenueData({ ...venueData, name: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Location"
              placeholderTextColor={"#999"}
              value={venueData.location}
              onChangeText={(text) => setVenueData({ ...venueData, location: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Price (R)"
              placeholderTextColor={"#999"}
              keyboardType="numeric"
              value={venueData.price.toString()}
              onChangeText={(text) => setVenueData({ ...venueData, price: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Capacity"
              placeholderTextColor={"#999"}
              keyboardType="numeric"
              value={venueData.capacity.toString()}
              onChangeText={(text) => setVenueData({ ...venueData, capacity: text })}
              style={styles.input}
            />


            {/* ✅ Tool Selection */}
            <Text style={styles.sectionLabel}>Select Available Tools:</Text>
            <View style={styles.toolsContainer}>
              {availableTools.map((tool) => {
                const isSelected = selectedToolIds.includes(tool.id);
                return (
                  <TouchableOpacity
                    key={tool.id}
                    style={[
                      styles.toolChip,
                      isSelected && styles.toolChipSelected,
                    ]}
                    onPress={() => toggleTool(tool.id)}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? "check-circle" : "tools"}
                      size={16}
                      color={isSelected ? "#fff" : "#0077B6"}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[
                      styles.toolText,
                      isSelected && styles.toolTextSelected
                    ]}>
                      {tool.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#0077B6" }]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>{editMode ? "Update" : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "gray" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", color: "#0077B6", marginBottom: 15 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#0077B6",
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  flatListContainer: { paddingHorizontal: 5, paddingBottom: 20 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0077B6",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    marginBottom: 15,
  },
  addText: { color: "#fff", marginLeft: 6, fontWeight: "bold" },
  emptyText: { textAlign: "center", marginTop: 40, color: "gray" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    maxWidth: width - 40,
  },
  cardContent: { marginTop: 10 },
  carouselImage: { width: "100%", height: 160, borderRadius: 10 },
  placeholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  venueName: { fontSize: 16, fontWeight: "bold", color: "#0077B6" },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  details: { fontSize: 13, color: "#333", marginLeft: 6, flex: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, gap: 16 },
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "#00000090", alignItems: "center" },
  modalContent: { backgroundColor: "white", margin: 20, borderRadius: 15, padding: 20, width: "90%", maxHeight: "70%" },
  modalHeader: { fontSize: 18, fontWeight: "bold", color: "#0077B6", marginBottom: 10, textAlign: "center" },
  imagePicker: { alignItems: "center", marginBottom: 10 },
  previewImage: { width: 80, height: 80, borderRadius: 12 },
  deleteImageButton: { position: "absolute", top: -5, right: -5 },
  input: { borderWidth: 1, borderColor: "#0077B6", borderRadius: 8, padding: 8, marginBottom: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  modalButton: { flex: 1, marginHorizontal: 5, padding: 10, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0077B6",
    marginTop: 15,
    marginBottom: 8,
  },
  toolsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#0077B6",
    backgroundColor: "#fff",
  },
  toolChipSelected: {
    backgroundColor: "#0077B6",
  },
  toolText: {
    color: "#0077B6",
    fontWeight: "600",
  },
  toolTextSelected: {
    color: "#fff",
  },
});
