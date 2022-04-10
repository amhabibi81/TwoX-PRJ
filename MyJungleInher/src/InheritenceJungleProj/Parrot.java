package InheritenceJungleProj;

public class Parrot extends Bird implements Prey{
    private String special_adjective;

    public Parrot(String name, int age, int height_of_fly, String special_adjective) {
        super(name, age, height_of_fly);
        this.special_adjective = special_adjective;
    }

    @Override
    void show() {
        super.show();
        System.out.println(", \""+special_adjective+"\"");
    }
}
