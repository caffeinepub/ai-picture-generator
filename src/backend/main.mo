import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Int "mo:core/Int";
import Migration "migration";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

(with migration = Migration.run)
actor {
  type Generation = {
    id : Text;
    prompt : Text;
    style : Text;
    imageUrl : Text;
    timestamp : Int;
  };

  module Generation {
    public func compare(g1 : Generation, g2 : Generation) : Order.Order {
      Int.compare(g2.timestamp, g1.timestamp);
    };
  };

  let generations = Map.empty<Text, Generation>();

  func getId() : Text {
    generations.size().toText();
  };

  func getNow() : Int {
    Time.now();
  };

  public shared ({ caller }) func saveGeneration(prompt : Text, style : Text, imageUrl : Text) : async Generation {
    let generation : Generation = {
      id = getId();
      prompt;
      style;
      imageUrl;
      timestamp = getNow();
    };
    generations.add(generation.id, generation);
    generation;
  };

  public query ({ caller }) func getGenerations() : async [Generation] {
    generations.values().toArray().sort();
  };

  public shared ({ caller }) func deleteGeneration(id : Text) : async () {
    switch (generations.get(id)) {
      case (null) { Runtime.trap("Generation does not exist") };
      case (_) { generations.remove(id) };
    };
  };
};
