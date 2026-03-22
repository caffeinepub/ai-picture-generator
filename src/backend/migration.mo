import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

module {
  type OldScore = {
    playerName : Text;
    scoreValue : Nat;
    timestamp : Int;
  };

  type OldActor = {
    scores : Map.Map<Text, OldScore>;
  };

  type Generation = {
    id : Text;
    prompt : Text;
    style : Text;
    imageUrl : Text;
    timestamp : Int;
  };

  type NewActor = {
    generations : Map.Map<Text, Generation>;
  };

  func convertOldScoreToGeneration(oldScore : OldScore) : Generation {
    {
      id = oldScore.playerName;
      prompt = "Old score by: " # oldScore.playerName;
      style = oldScore.scoreValue.toText();
      imageUrl = "https://default.com";
      timestamp = oldScore.timestamp;
    };
  };

  public func run(old : OldActor) : NewActor {
    {
      generations = old.scores.map<Text, OldScore, Generation>(
        func(_key, oldScore) { convertOldScoreToGeneration(oldScore) }
      );
    };
  };
};
