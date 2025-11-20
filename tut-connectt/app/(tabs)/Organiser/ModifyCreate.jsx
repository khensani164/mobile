import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { updateEventAPI } from "../../data/Organiser/myEvents";

export default function ModifyCard() {
  const navigation = useNavigation();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);

  // State Hooks
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [status, setStatus] = useState("");
  const [expectedAttend, setExpectedAttend] = useState("");
  const [totalTickets, setTotalTickets] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [ticketRequired, setTicketRequired] = useState(false);
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [allowAttendeePurchase, setAllowAttendeePurchase] = useState(false);
  const [ticketQuantities, setTicketQuantities] = useState({});

  useEffect(() => {
    if (eventData) {
      setName(eventData.name || "");
      setDescription(eventData.description || "");
      setStartDateTime(eventData.startDateTime || "");
      setEndDateTime(eventData.endDateTime || "");
      setStatus(eventData.status || "");
      setExpectedAttend(eventData.expectedAttend ? String(eventData.expectedAttend) : "");
      setTotalTickets(eventData.totalTickets ? String(eventData.totalTickets) : "");
      setIsFree(eventData.isFree || false);
      setTicketRequired(eventData.ticketRequired || false);
      setAutoDistribute(eventData.autoDistribute || false);
      setAllowAttendeePurchase(eventData.allowAttendeePurchase || false);
      setTicketQuantities(
        (eventData.ticketDefinitions || []).reduce((acc, t) => {
          acc[t.id] = t.quantity !== null ? String(t.quantity) : "";
          return acc;
        }, {})
      );
    }
  }, [eventData]);

  useEffect(() => {
    const loadSelectedEvent = async () => {
      try {
        const selectedEvent = await AsyncStorage.getItem('selectedEvent');
        if (selectedEvent) {
          setEventData(JSON.parse(selectedEvent));
        } else {
          Alert.alert("Error", "No event selected. Redirecting to event list.");
          navigation.navigate("Events");
        }
      } catch (error) {
        console.error("Failed to load selected event:", error);
        Alert.alert("Error", "Failed to load event data.");
        navigation.navigate("Events");
      } finally {
        setLoading(false);
      }
    };

    loadSelectedEvent();
  }, [navigation]);

  const handleQuantityChange = (ticketId, value) => {
    if (/^\d*$/.test(value)) {
      setTicketQuantities(prev => ({ ...prev, [ticketId]: value }));
    }
  };

  const maybeAdd = (updatedFields, key, newValue, originalValue) => {
    if (newValue !== originalValue) {
      updatedFields[key] = newValue;
    }
  };


  const validateInputs = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Event name is required.");
      return false;
    }
    if (!description.trim()) {
      Alert.alert("Validation Error", "Description is required.");
      return false;
    }
    if (!startDateTime.trim()) {
      Alert.alert("Validation Error", "Start date and time are required.");
      return false;
    }
    if (!endDateTime.trim()) {
      Alert.alert("Validation Error", "End date and time are required.");
      return false;
    }
    if (!status.trim()) {
      Alert.alert("Validation Error", "Event status is required.");
      return false;
    }
    return true;
  };

  const handleModify = async () => {
    // Initialize the updatedFields object
    const updatedFields = {};

    if (!validateInputs()) return;

    // Compare the values and add them to updatedFields if changed
    maybeAdd(updatedFields, "name", name, eventData.name);
    maybeAdd(updatedFields, "description", description, eventData.description);
    maybeAdd(updatedFields, "startDateTime", startDateTime, eventData.startDateTime);
    maybeAdd(updatedFields, "endDateTime", endDateTime, eventData.endDateTime);
    maybeAdd(updatedFields, "status", status, eventData.status);

    // Handle expectedAttendance and totalTickets if they are changed
    if (expectedAttend !== "" && expectedAttend !== String(eventData.expectedAttend)) {
      updatedFields.expectedAttend = parseInt(expectedAttend);
    }

    if (totalTickets !== "" && totalTickets !== String(eventData.totalTickets)) {
      updatedFields.totalTickets = parseInt(totalTickets);
    }

    // Handle boolean fields directly
    updatedFields.isFree = isFree;
    updatedFields.ticketRequired = ticketRequired;
    updatedFields.autoDistribute = autoDistribute;
    updatedFields.allowAttendeePurchase = allowAttendeePurchase;

    // Handle ticket quantities if there are any changes
    const originalTickets = eventData.ticketDefinitions || [];
    let ticketsChanged = false;

    const updatedTickets = originalTickets.map(t => {
      const newQuantity = ticketQuantities[t.id];
      const same = newQuantity === "" || parseInt(newQuantity) === t.quantity;

      if (!same) ticketsChanged = true;

      return {
        ...t,
        quantity: same ? t.quantity : parseInt(newQuantity, 10),
      };
    });

    if (ticketsChanged) {
      updatedFields.ticketDefinitions = {
        update: updatedTickets.map(t => ({
          where: { id: t.id },
          data: { quantity: t.quantity },
        })),
      };
    }

    // If no changes, show alert and return
    if (Object.keys(updatedFields).length === 0) {
      Alert.alert("No Changes", "No changes were made to the event.");
      return;
    }

    // Send the updated fields to the API
    try {
      await updateEventAPI(eventData.id, updatedFields);
      Alert.alert("Success", "Event updated successfully!");
      navigation.navigate("Events");
    } catch (error) {
      console.error("❌ Update failed:", error);
      Alert.alert("Error", error.message || "Failed to update event.");
    }
  };



  const handleCancel = () => navigation.navigate("Events");

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (!eventData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Event not found or failed to load.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Events")}>
          <Text style={styles.primaryButtonText}>Go Back to Events</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Modify Event</Text>

        {/* Event Name */}
        <TextInputField label="Event Name" value={name} onChangeText={setName} placeholder="Enter event name" />

        {/* Event Description */}
        <TextInputField label="Description" value={description} onChangeText={setDescription} placeholder="Enter description" multiline />

        {/* Date and Time */}
        <TextInputField label="Start Date & Time" value={startDateTime} onChangeText={setStartDateTime} placeholder="YYYY-MM-DD HH:MM" />
        <TextInputField label="End Date & Time" value={endDateTime} onChangeText={setEndDateTime} placeholder="YYYY-MM-DD HH:MM" />

        {/* Expected Attendance */}
        <TextInputField label="Expected Attendance" value={expectedAttend} onChangeText={setExpectedAttend} placeholder="Number of expected attendees" keyboardType="numeric" />

        {/* Total Tickets */}
        <TextInputField label="Total Tickets" value={totalTickets} onChangeText={setTotalTickets} placeholder="Total tickets available" keyboardType="numeric" />

        {/* Switches for Options */}
        <SwitchRow label="Is this event free?" value={isFree} onValueChange={setIsFree} />
        <SwitchRow label="Ticket required for attendance?" value={ticketRequired} onValueChange={setTicketRequired} />
        <SwitchRow label="Auto-distribute tickets?" value={autoDistribute} onValueChange={setAutoDistribute} />
        <SwitchRow label="Allow attendees to purchase tickets?" value={allowAttendeePurchase} onValueChange={setAllowAttendeePurchase} />

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleCancel}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleModify}>
            <Text style={styles.buttonText}>Modify</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Helper components for input fields
const TextInputField = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = "default" }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && { height: 80 }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  </View>
);

const SwitchRow = ({ label, value, onValueChange }) => (
  <View style={styles.switchRow}>
    <Text style={styles.switchLabel}>{label}</Text>
    <Switch value={value} onValueChange={onValueChange} />
  </View>
);

// Styles for the page
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f9f9f9" }, // REMOVED flex: 1 HERE
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 20, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20, color: "#333" },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 5 },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingLeft: 12,
    backgroundColor: "#fff",
    fontSize: 14,
    marginBottom: 16,
  },
  inputContainer: { marginBottom: 16 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#444" },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  button: { backgroundColor: "#0077B6", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: "center", flex: 1 },
  buttonText: { color: "#fff", fontWeight: "bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { color: "#333", fontSize: 18 },
  primaryButton: { backgroundColor: "#0077B6", padding: 12, borderRadius: 8, marginTop: 20 },
  primaryButtonText: { color: "#fff", fontWeight: "bold" },
});