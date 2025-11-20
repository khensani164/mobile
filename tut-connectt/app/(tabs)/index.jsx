import { Pressable, Text, View } from "react-native";
import { Link, useNavigation } from "expo-router";
import { useEffect } from "react";
import { Image } from "react-native";
import { StyleSheet , ActivityIndicator} from "react-native";
import {  useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";

export default function Index() {
  const navigation = useNavigation();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    navigation.setOptions({ headerShown: false });

    
  },);


  useEffect(() => {
    const checkLoginStatus = async () => {
      try {

        await new Promise(resolve => setTimeout(resolve, 500));
        const savedUser = await AsyncStorage.getItem("userSession");

        if (savedUser) {
          const user = JSON.parse(savedUser);
          const role = user.role?.toLowerCase();

          
          if (role === "organiser") {
            router.replace("(tabs)/Organiser/orgaDash");
          } else if (role === "admin") {
            router.replace("(tabs)/Admin/adminDash");
          } else {
            router.replace("(tabs)/Attendee/Home");
          }

          return;
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }

      setLoading(false);
    };

    checkLoginStatus();
  }, []);

  if (loading) {
    return (
      <View style={style.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  

  return (
    <View style={style.container}>
      
      <Image source={require('@/assets/images/TUT-Logo1.jpg')} style={style.logo} />

      <Text style={style.title}>Welcome To Smart Events!</Text>

      <Text style={style.subtitle}>Your Ultimate Guide To Campus Events. Discover, Register And Engage With Everything Happening At TUT</Text>

      <Link href="/AuthScreen" asChild>
        <Pressable style={style.button}>
          <Text style= {style.buttonText}>Get Started</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingLeft:20, 
    paddingRight:20,
  },logo: {
    marginTop: 100, 
    width: 200, 
    height: 200, 
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1c1c1c'
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingLeft: 24,
    paddingRight: 24,
    color: '#3d3d3d' 
  },button:{ 
    marginTop: 20,
    backgroundColor: '#0077B6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    
  },buttonText:{
    color: '#f2f2f2',
    fontSize: 16,
    fontWeight: 'bold',
  },center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

});



