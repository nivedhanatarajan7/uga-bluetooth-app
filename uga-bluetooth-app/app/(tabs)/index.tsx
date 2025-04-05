import { StyleSheet, View, Text, Button } from "react-native"
import PetCard from "../components/PetCard"

const pets = [
  {
    name: "Mango",
    animalType: "Cat",
    breed: "British Shorthair",
    imgAddr: "./pet.jpg"
  },
  {
    name: "Sparky",
    animalType: "Dog",
    breed: "Golden Retriever",
    imgAddr: "./pet.jpg"

  }
]

const Home = () => {
    return (
        <View>
            <Text style={{ fontSize: 20, marginTop: 50, marginLeft: 30, fontWeight: "bold" }}>My Animals</Text>
            
            {Object.entries(pets).map((currPet) => (
                <PetCard key={currPet} name={currPet[1].name} type={currPet[1].animalType} breed={currPet[1].breed} img={currPet[1].imgAddr}/>
            ))}
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