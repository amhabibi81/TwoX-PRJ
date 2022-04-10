package InheritenceJungleProj;

public class Eagle extends Bird implements Hunter {
    private String special_adjective;

    public Eagle(String name, int age, int height_of_fly, String special_adjective) {
        super(name, age, height_of_fly);
        this.special_adjective = special_adjective;
    }

    @Override
    void show() {
        super.show();
        System.out.println(", \""+special_adjective+"\"");
    }
}
