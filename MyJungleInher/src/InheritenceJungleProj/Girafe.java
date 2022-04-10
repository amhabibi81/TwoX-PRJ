package InheritenceJungleProj;

public class Girafe extends Mammal implements Prey{
    private String special_adjective;

    public Girafe(String name, int age, int speed, String special_adjective) {
        super(name, age, speed);
        this.special_adjective = special_adjective;
    }

    @Override
    void show() {
        super.show();
        System.out.println(", \""+special_adjective+"\"");
    }
}
