import { StyleSheet, View, Text, Button } from "react-native"
import PetCard from "../components/PetCard"

const Home = () => {
    return (
        <View>
            <Text style={{ fontSize: 20, marginTop: 50, marginLeft: 30, fontWeight: "bold" }}>My Animals</Text>
            
            <PetCard />
            <PetCard />
            <PetCard />
            <View style={styles.button}>
            <Button
          onPress={() => {}}
          title="Add an Animal"
          color="#3c7962"
          accessibilityLabel="Add an animal"
        />
        </View>
        </View>
    )
}



export default Home

const styles = StyleSheet.create({
  button: {
    margin: 50,
  }
});