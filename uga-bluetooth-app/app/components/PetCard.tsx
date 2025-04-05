import { useRouter } from "expo-router";
import { Text, Button, Image, StyleSheet, View } from "react-native";
const PetCard = ({ name, type, breed, img }: any) => {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      <View style={styles.left}>
        <Image source={img} style={styles.image} />
        <Text style={styles.name}>{name}</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.name}>
          {type}: {breed}
        </Text>
        <Button
          onPress={() => {
            router.push("/Overview");
          }}
          title="Alerts"
          color="#3c7962"
          accessibilityLabel="Check alerts"
        />

        <Button
          onPress={() => {}}
          title="Check Conditions"
          color="#3c7962"
          accessibilityLabel="Check Conditions"
        />
      </View>
    </View>
  );
};

export default PetCard;

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    margin: 30,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },
  left: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    flex: 2,
    justifyContent: "space-evenly",
    gap: 10,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 50,
    borderColor: "#3c7962",
    borderWidth: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },
});
